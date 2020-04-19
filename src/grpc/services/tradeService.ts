import grpc from 'grpc';
import { TradeService } from 'tdex-protobuf/js/trade_grpc_pb';
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

import Markets from '../../models/markets';
import { DBInterface } from '../../db/datastore';
import { fetchBalances } from '../../utils';
import { VaultInterface } from '../../core/vault';

//import { SwapFail, SwapAccept } from 'tdex-protobuf/js/swap_pb';

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
      const { balances } = await fetchBalances(marketFound.walletAddress);
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
    try {
      const model = new Markets(this.datastore.markets);
      const reply = new TradeProposeReply();
      const market = call.request.getMarket();
      if (!market)
        throw {
          code: grpc.status.INVALID_ARGUMENT,
          name: 'INVALID_ARGUMENT',
          message: 'Malformed request',
        };

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

      const derivationIndex = marketFound.derivationIndex;
      const wallet = this.vault.derive(derivationIndex, this.network);
      console.log(wallet.address);

      reply.setMsg();
      call.write(reply);
      call.end();
    } catch (e) {
      console.error(e);
      call.emit('close', e);
      call.end();
    }

    /*   try {
        // retrieve wallet for market
        const wallet: WalletInterface = await this.vaultController.getWallet(
          market.walletAddress,
        );
  
        // validate incoming swap request
        const serializedSwapRequest = this.swapController.validate(
          args.swapRequest,
          market.fee,
          balances,
        );
  
        // fetch wallet utxos and update swap request
        const utxos = await fetchUtxos(wallet.address, this.explorer);
        const feeUtxos = await fetchUtxos(
          this.feeWalletController.getAddress(),
          this.explorer,
        );
        // add swap input and outputs
        const unsignedPsbt: string = wallet.updateTx(
          args.swapRequest.transaction,
          utxos,
          args.swapRequest.amountR,
          args.swapRequest.amountP,
          args.swapRequest.assetR,
          args.swapRequest.assetP,
        );
  
        const psbtWithFees: string = this.feeWalletController.payFees(
          unsignedPsbt,
          feeUtxos,
        );
  
        const psbtBase64: string = wallet.sign(psbtWithFees);
  
        return this.swapController.accept(serializedSwapRequest, psbtBase64);
      } catch (e) {
        this.marketController.startTradingMarket(market.quoteAsset);
        throw e;
      }  */
  }

  tradeComplete(call: grpc.ServerWritableStream<TradeCompleteRequest>): void {
    console.log(call.request.toObject());

    const reply = new TradeCompleteReply();
    call.write(reply);
    call.end();
  }
}

export { Trade, TradeService };
