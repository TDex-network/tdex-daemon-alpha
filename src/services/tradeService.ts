import grpc from 'grpc';
import {
  Swap,
  calculateExpectedAmount,
  calculateProposeAmount,
} from 'tdex-sdk';
import { Logger } from 'winston';

import {
  Balance as ProtoBalance,
  BalancesReply,
  BalancesRequest,
  TradeCompleteRequest,
  TradeCompleteReply,
  MarketsReply,
  MarketWithFee,
  Market as ProtoMarket,
  TradeProposeRequest,
  TradeProposeReply,
} from 'tdex-protobuf/js/trade_pb';
import { SwapAccept } from 'tdex-protobuf/js/swap_pb';
import { TradeService } from 'tdex-protobuf/js/trade_grpc_pb';

import Markets from '../models/markets';
import { DBInterface } from '../db/datastore';
import { pushTx } from '../utils';
import { VaultInterface } from '../components/vault';
import { networks } from 'liquidjs-lib';
import Swaps from '../models/swaps';
import Wallet from '../components/wallet';
import Balance from '../components/balance';
import Unspent from '../components/unspent';
import Market from '../components/market';

class Trade {
  constructor(
    private datastore: DBInterface,
    private vault: VaultInterface,
    private network: string,
    private explorer: string,
    private logger: Logger
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
        const market = new ProtoMarket();
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
      const baseAsset = market!.getBaseAsset();
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
      const balance = new Balance(
        this.datastore.unspents,
        this.explorer,
        this.logger
      );
      const balances = await balance.fromMarket(marketFound.walletAddress, {
        baseAsset,
        quoteAsset,
      });

      const baseBalance = new ProtoBalance();
      const quoteBalance = new ProtoBalance();
      baseBalance.setAsset(baseAsset);
      baseBalance.setAmount(balances[baseAsset].balance);
      quoteBalance.setAsset(quoteAsset);
      quoteBalance.setAmount(balances[quoteAsset].balance);
      reply.addBalances(baseBalance);
      reply.addBalances(quoteBalance);

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
      const tradeType = call.request.getType();
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

      const baseAsset = market!.getBaseAsset();
      const assetP = swapRequestMessage!.getAssetP();
      const assetR = swapRequestMessage!.getAssetR();
      const amountP = swapRequestMessage!.getAmountP();
      const amountR = swapRequestMessage!.getAmountR();
      const transaction = swapRequestMessage!.getTransaction();

      const marketBalance = new Balance(
        this.datastore.unspents,
        this.explorer,
        this.logger
      );
      const marketBalances = await marketBalance.fromMarket(
        marketFound.walletAddress,
        {
          baseAsset,
          quoteAsset,
        }
      );

      const balanceP = marketBalances[assetP].balance;
      const balanceR = marketBalances[assetR].balance;

      const marketUtxos = marketBalances[assetR].utxos;

      if (tradeType === TradeProposeRequest.Type.BUY) {
        const proposeAmount = calculateProposeAmount(
          balanceP,
          balanceR,
          amountR,
          marketFound.fee
        );
        // TODO check possible slippage due network congestion
        if (proposeAmount !== amountP)
          throw new Error('Not valid amount_p for the requested amount_r');
      } else {
        const expectedAmount = calculateExpectedAmount(
          balanceP,
          balanceR,
          amountP,
          marketFound.fee
        );
        //TODO Here we need to take into account a little slippage so the check need to be a range between a min and max spread
        if (expectedAmount !== amountR)
          throw new Error('Not valid amount_r for the proposed amount_p');
      }

      // Let's stop all markets to not process other concurrent swaps
      await Market.updateAllTradableStatus(
        false,
        this.datastore.markets,
        this.logger
      );

      const derivationIndex = marketFound.derivationIndex;
      const wallet = this.vault.derive(derivationIndex, this.network);
      // add swap input and outputs
      const unsignedPsbt: any = wallet.updateTx(
        transaction,
        marketUtxos,
        amountR,
        amountP,
        assetR,
        assetP
      );

      // For now we assume to use only the 0 index for the fee wallet
      const feeWallet = this.vault.derive(0, this.network, true);
      // Liquid Bitcoin asset hash
      const bitcoinAssetHash = (networks as any)[this.network].assetHash;
      const feeBalance = new Balance(
        this.datastore.unspents,
        this.explorer,
        this.logger
      );
      const feeUtxos = (
        await feeBalance.fromAsset(feeWallet.address, bitcoinAssetHash)
      )[bitcoinAssetHash].utxos;

      const unsignedPsbtWithFees: any = feeWallet.payFees(
        unsignedPsbt.base64,
        feeUtxos
      );

      const signedPsbtWithFees = feeWallet.sign(unsignedPsbtWithFees.base64);
      const signedPsbt: string = wallet.sign(signedPsbtWithFees);

      const swap = new Swap({ chain: this.network });
      const swapAcceptMessageSerialized = swap.accept({
        message: swapRequestMessage.serializeBinary(),
        psbtBase64: signedPsbt,
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
      reply.setSwapAccept(swapAcceptMessage);

      await Unspent.lock(
        unsignedPsbt.selectedUtxos,
        swapAcceptId,
        this.datastore.unspents
      );
      await Unspent.lock(
        unsignedPsbtWithFees.selectedUtxos,
        swapAcceptId,
        this.datastore.unspents
      );

      call.write(reply);
      call.end();
    } catch (e) {
      await Market.updateAllTradableStatus(
        true,
        this.datastore.markets,
        this.logger
      );

      console.error(e);
      call.emit('error', e);
      call.write(e);
      call.end();
    }
  }

  async tradeComplete(
    call: grpc.ServerWritableStream<TradeCompleteRequest>
  ): Promise<void> {
    const swapModel = new Swaps(this.datastore.swaps);
    const swapComplete = call.request.getSwapComplete();
    const swapAcceptId = swapComplete!.getAcceptId();
    try {
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
      const txid = await pushTx(hex, this.explorer);

      // Restart all previously stopped markets
      await Market.updateAllTradableStatus(
        true,
        this.datastore.markets,
        this.logger
      );
      await swapModel.updateSwap({ swapAcceptId }, { completed: true, txid });

      const reply = new TradeCompleteReply();
      reply.setTxid(txid);
      call.write(reply);
      call.end();
    } catch (e) {
      await Unspent.unlock(swapAcceptId, this.datastore.unspents);
      console.error(e);
      call.emit('error', e);
      call.write(e);
      call.end();
    }
  }
}

export { Trade, TradeService };
