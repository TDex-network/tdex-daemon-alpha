import grpc from 'grpc';
import { Swap } from 'tdex-sdk';

import {
  Balance,
  BalancesReply,
  BalancesRequest,
  TradeCompleteRequest,
  TradeCompleteReply,
  MarketsReply,
  MarketWithFee,
  Market,
  TradeProposeRequest,
  TradeProposeReply,
} from 'tdex-protobuf/js/trade_pb';
import { SwapAccept } from 'tdex-protobuf/js/swap_pb';
import { TradeService } from 'tdex-protobuf/js/trade_grpc_pb';

import Markets from '../models/markets';
import { DBInterface } from '../db/datastore';
import { fetchBalances, fetchUtxos, pushTx } from '../utils';
import { VaultInterface } from '../components/vault';
import { calculateExpectedAmount } from '../components/trade';
import { networks } from 'liquidjs-lib';
import Swaps from '../models/swaps';
import Wallet from '../components/wallet';

class Trade {
  constructor(
    private datastore: DBInterface,
    private vault: VaultInterface,
    private network: string
  ) {}

  async markets(
    _: any,
    callback: grpc.sendUnaryData<MarketsReply>
  ): Promise<void> {
    try {
      const model = new Markets(this.datastore.markets);
      const reply = new MarketsReply();
      const markets = await model.getMarkets({ tradable: true });
      markets.forEach((m: any) => {
        const marketWithfee = new MarketWithFee();
        const market = new Market();
        market.setBaseAsset(m.baseAsset);
        market.setQuoteAsset(m.quoteAsset);
        marketWithfee.setMarket(market);
        marketWithfee.setFee(m.fee);
        reply.addMarkets(marketWithfee);
      });
      return callback(null, reply);
    } catch (e) {
      return callback(e, null);
    }
  }

  async balances(
    call: grpc.ServerUnaryCall<BalancesRequest>,
    callback: grpc.sendUnaryData<BalancesReply>
  ): Promise<void> {
    try {
      const model = new Markets(this.datastore.markets);
      const market = call.request.getMarket();
      if (!market)
        throw {
          code: grpc.status.INVALID_ARGUMENT,
          name: 'INVALID_ARGUMENT',
          message: 'Malformed request',
        };

      const reply = new BalancesReply();
      const quoteAsset = market!.getQuoteAsset();
      const marketFound = await model.getMarket({ quoteAsset });
      if (!marketFound)
        throw {
          code: grpc.status.NOT_FOUND,
          name: 'NOT_FOUND',
          message: 'Market not found',
        };

      if (!marketFound.tradable)
        throw {
          code: grpc.status.UNAVAILABLE,
          name: 'UNAVAILABLE',
          message: 'Market is currently unavailable. Retry',
        };

      reply.setFee(marketFound.fee);
      const { balances } = await fetchBalances(
        marketFound.walletAddress,
        this.network
      );
      Object.entries(balances).forEach(([asset, amount]: [string, any]) => {
        const balance = new Balance();
        balance.setAsset(asset);
        balance.setAmount(Number(amount));
        reply.addBalances(balance);
      });

      return callback(null, reply);
    } catch (e) {
      return callback(e, null);
    }
  }

  async tradePropose(
    call: grpc.ServerWritableStream<TradeProposeRequest>
  ): Promise<void> {
    const marketModel = new Markets(this.datastore.markets);
    const swapModel = new Swaps(this.datastore.swaps);
    let quoteAsset = undefined;
    try {
      const market = call.request.getMarket();
      const swapRequestMessage = call.request.getSwapRequest();
      if (!market || !swapRequestMessage)
        throw {
          code: grpc.status.INVALID_ARGUMENT,
          name: 'INVALID_ARGUMENT',
          message: 'Malformed request',
        };

      quoteAsset = market!.getQuoteAsset();
      const marketFound = await marketModel.getMarket({ quoteAsset });
      if (!marketFound)
        throw {
          code: grpc.status.NOT_FOUND,
          name: 'NOT_FOUND',
          message: 'Market not found',
        };

      if (!marketFound.tradable)
        throw {
          code: grpc.status.UNAVAILABLE,
          name: 'UNAVAILABLE',
          message: 'Market is currently unavailable. Retry',
        };

      const assetP = swapRequestMessage!.getAssetP();
      const assetR = swapRequestMessage!.getAssetR();
      const amountP = swapRequestMessage!.getAmountP();
      const amountR = swapRequestMessage!.getAmountR();
      const transaction = swapRequestMessage!.getTransaction();

      const { balances, utxos } = await fetchBalances(
        marketFound.walletAddress,
        this.network
      );
      const balanceP = balances[assetP];
      const balanceR = balances[assetR];
      const expectedAmount = calculateExpectedAmount(
        balanceP,
        balanceR,
        amountP,
        marketFound.fee
      );

      //TODO Here we need to take into account a little slippage so the check need to be a range between a min and max spread
      if (expectedAmount !== amountR)
        throw new Error('Not valid amount_r for the proposed amount_p');

      // Let's stop the market to not process other concurrent swaps
      await marketModel.updateMarket({ quoteAsset }, { tradable: false });

      const derivationIndex = marketFound.derivationIndex;
      const wallet = this.vault.derive(derivationIndex, this.network);
      // add swap input and outputs
      const unsignedPsbt: string = wallet.updateTx(
        transaction,
        utxos[assetR],
        amountR,
        amountP,
        assetR,
        assetP
      );

      // For now we assume to use only the 0 index for the fee wallet
      const feeWallet = this.vault.derive(0, this.network, true);
      // Liquid Bitcoin asset hash 
      const bitcoinAssetHash = (networks as any)[this.network].assetHash;
      const feeUtxos = await fetchUtxos(
        feeWallet.address,
        this.network,
        bitcoinAssetHash
      );

      const psbtWithFeesUnsigned: string = feeWallet.payFees(
        unsignedPsbt,
        feeUtxos
      );

      const psbtWithFees = feeWallet.sign(psbtWithFeesUnsigned);
      const psbtBase64: string = wallet.sign(psbtWithFees);

      const swap = new Swap({ chain: this.network });
      const swapAcceptMessageSerialized = swap.accept({
        message: swapRequestMessage.serializeBinary(),
        psbtBase64: psbtBase64,
      });
      const swapAcceptMessage = SwapAccept.deserializeBinary(
        swapAcceptMessageSerialized
      );

      const swapAcceptId = swapAcceptMessage.getId();
      await swapModel.addSwap({
        swapAcceptId,
        quoteAsset,
        completed: false,
        details: { assetP, amountP, assetR, amountR },
      });

      const reply = new TradeProposeReply();
      reply.setMsg(swapAcceptMessage);
      call.write(reply);
      call.end();
    } catch (e) {
      console.error(e);

      if (quoteAsset)
        await marketModel.updateMarket({ quoteAsset }, { tradable: true });

      call.emit('error', e);
      call.write(e);
      call.end();
    }
  }

  async tradeComplete(
    call: grpc.ServerWritableStream<TradeCompleteRequest>
  ): Promise<void> {
    const marketModel = new Markets(this.datastore.markets);
    const swapModel = new Swaps(this.datastore.swaps);
    try {
      const swapComplete = call.request.getMsg();
      const swapAcceptId = swapComplete!.getAcceptId();
      if (!swapComplete || !swapAcceptId)
        throw {
          code: grpc.status.INVALID_ARGUMENT,
          name: 'INVALID_ARGUMENT',
          message: 'Malformed request',
        };

      const swapFound = await swapModel.getSwap({ swapAcceptId });
      if (!swapFound)
        throw {
          code: grpc.status.NOT_FOUND,
          name: 'NOT_FOUND',
          message: 'Swap not found',
        };

      const transaction = swapComplete.getTransaction();
      const hex = Wallet.toHex(transaction);
      const txid = await pushTx(hex, this.network);

      await marketModel.updateMarket(
        { quoteAsset: swapFound.quoteAsset },
        { tradable: true }
      );
      await swapModel.updateSwap({ swapAcceptId }, { completed: true, txid });

      const reply = new TradeCompleteReply();
      reply.setTxid(txid);
      call.write(reply);
      call.end();
    } catch (e) {
      console.error(e);
      call.emit('error', e);
      call.write(e);
      call.end();
    }
  }
}

export { Trade, TradeService };
