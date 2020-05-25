import * as grpc from '@grpc/grpc-js';

import * as services from 'tdex-protobuf/js/trade_grpc_pb';
import * as messages from 'tdex-protobuf/js/trade_pb';
import { SwapRequest, SwapComplete } from 'tdex-protobuf/js/swap_pb';

const traderClient = new services.TradeClient(
  'localhost:9945',
  grpc.credentials.createInsecure()
);

/**
 * tradePropose
 * @param market
 * @param tradeType
 * @param swapRequestSerialized
 */

export function tradePropose(
  { baseAsset, quoteAsset }: any,
  tradeType: number,
  swapRequestSerialized: Uint8Array
): Promise<any> {
  return new Promise((resolve, reject) => {
    const market = new messages.Market();
    market.setBaseAsset(baseAsset);
    market.setQuoteAsset(quoteAsset);

    const request = new messages.TradeProposeRequest();
    request.setMarket(market);
    request.setType(tradeType);
    request.setSwapRequest(
      SwapRequest.deserializeBinary(swapRequestSerialized)
    );

    const call = traderClient.tradePropose(request);
    let data: Uint8Array;
    call.on('data', (reply: messages.TradeProposeReply) => {
      const swapAcceptMsg = reply!.getSwapAccept();
      data = swapAcceptMsg!.serializeBinary();
    });

    call.on('end', () => resolve(data));
    call.on('error', (e) => reject(e));
  });
}

/**
 * tradeComplete
 * @param swapCompleteSerialized
 */

export function tradeComplete(
  swapCompleteSerialized: Uint8Array
): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.TradeCompleteRequest();
    request.setSwapComplete(
      SwapComplete.deserializeBinary(swapCompleteSerialized)
    );
    const call = traderClient.tradeComplete(request);
    let data: string;
    call.on('data', (reply) => {
      data = reply!.getTxid();
    });
    call.on('end', () => resolve(data));
    call.on('error', (e) => reject(e));
  });
}

export function markets(): Promise<Array<any>> {
  return new Promise((resolve, reject) => {
    traderClient.markets(new messages.MarketsRequest(), (err, response) => {
      if (err) return reject(err);
      const list = response!
        .getMarketsList()
        .map((item: any) => item!.getMarket())
        .map((market: any) => ({
          baseAsset: market!.getBaseAsset(),
          quoteAsset: market!.getQuoteAsset(),
        }));
      resolve(list);
    });
  });
}

export function balances({
  baseAsset,
  quoteAsset,
}: {
  baseAsset: string;
  quoteAsset: string;
}): Promise<any> {
  const market = new messages.Market();
  market.setBaseAsset(baseAsset);
  market.setQuoteAsset(quoteAsset);
  const request = new messages.BalancesRequest();
  request.setMarket(market);

  return new Promise((resolve, reject) => {
    traderClient.balances(request, (err, response) => {
      if (err) return reject(err);

      const baseAmount: number = response
        .getBalancesList()
        .find((b) => b.getAsset() === baseAsset)!
        .getAmount();
      const quoteAmount: number = response
        .getBalancesList()
        .find((b) => b.getAsset() === quoteAsset)!
        .getAmount();
      const reply = {
        fee: response!.getFee(),
        balances: {
          [baseAsset]: baseAmount,
          [quoteAsset]: quoteAmount,
        },
      };
      resolve(reply);
    });
  });
}
