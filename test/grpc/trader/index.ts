import * as grpc from 'grpc';

import * as services from 'tdex-protobuf/js/trade_grpc_pb';
import * as messages from 'tdex-protobuf/js/trade_pb';
import { SwapRequest } from 'tdex-protobuf/js/swap_pb';
import { Swap } from 'tdex-sdk';

const traderClient = new services.TradeClient(
  'localhost:9945',
  grpc.credentials.createInsecure()
);

export function tradePropose(
  { baseAsset, quoteAsset }: any,
  {
    assetToBeSent,
    amountToBeSent,
    assetToReceive,
    amountToReceive,
    psbtBase64,
  }: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const type = assetToReceive === baseAsset ? 0 : 1;
    const market = new messages.Market();
    market.setBaseAsset(baseAsset);
    market.setQuoteAsset(quoteAsset);
    const swap = new Swap({ chain: 'regtest' });
    const swapRequestSerialized = swap.request({
      assetToBeSent,
      amountToBeSent,
      assetToReceive,
      amountToReceive,
      psbtBase64,
    });
    const request = new messages.TradeProposeRequest();
    request.setMarket(market);
    request.setType(type);
    request.setSwapRequest(
      SwapRequest.deserializeBinary(swapRequestSerialized)
    );

    const call = traderClient.tradePropose(request);
    let data: Uint8Array;
    call.on('data', (reply) => {
      const swapAcceptMsg = reply!.getMsg();
      data = swapAcceptMsg!.serializeBinary();
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
