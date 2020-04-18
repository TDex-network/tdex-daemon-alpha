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
} from 'tdex-protobuf/js/trade_pb';

//import { SwapFail, SwapAccept } from 'tdex-protobuf/js/swap_pb';

class Trade {
  public balances(
    call: grpc.ServerUnaryCall<BalancesRequest>,
    callback: grpc.sendUnaryData<BalancesReply>
  ): void {
    try {
      console.log(call.request.toObject());
      const reply = new BalancesReply();
      const { balances, fee } = {
        balances: [
          { asset: 'foo', amount: 100 },
          { asset: 'bar', amount: 100 },
        ],
        fee: 0.25,
      };

      reply.setFee(fee);
      balances.forEach((b: any) => {
        const balance = new Balance();
        balance.setAsset(b.asset);
        balance.setAmount(b.amount);
        reply.addBalances(balance);
      });

      callback(null, reply);
    } catch (e) {
      const err: grpc.ServiceError = {
        message: e.message,
        name: e.name,
      };
      callback(err, null);
    }
  }

  async markets(
    _: any,
    callback: grpc.sendUnaryData<MarketsReply>
  ): Promise<void> {
    try {
      const reply = new MarketsReply();
      const markets = [{ baseAsset: 'foo', quoteAsset: 'bar', fee: 0.25 }];
      markets.forEach((m: any) => {
        const marketWithfee = new MarketWithFee();
        const market = new Market();
        market.setBaseAsset(m.baseAsset);
        market.setQuoteAsset(m.quoteAsset);
        marketWithfee.setMarket(market);
        marketWithfee.setFee(m.fee);
        reply.addMarkets(marketWithfee);
      });
      callback(null, reply);
    } catch (e) {
      const err: grpc.ServiceError = {
        message: e.message,
        name: e.name,
      };
      callback(err, null);
    }
  }

  async tradePropose(
    call: grpc.ServerWritableStream<TradeProposeRequest>
  ): Promise<void> {
    const request: any = call.request.toObject();
    console.log(request);

    call.end();
  }

  tradeComplete(call: grpc.ServerWritableStream<TradeCompleteRequest>): void {
    console.log(call.request.toObject());

    const reply = new TradeCompleteReply();
    call.write(reply);
    call.end();
  }
}

export { Trade, TradeService };
