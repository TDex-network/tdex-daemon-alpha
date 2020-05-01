import App from '../src/app';
import { feeDepositAddress, depositAddress } from './grpc/operator';
import { sleep, faucet, mint, fetchUtxos } from './helpers';
import { networks } from 'liquidjs-lib';
import { markets, balances, tradePropose, tradeComplete } from './grpc/trader';
import Wallet, { fromWIF, WalletInterface } from '../src/components/wallet';
import {
  Swap,
  calculateExpectedAmount,
  calculateProposeAmount,
} from 'tdex-sdk';
import { SwapAccept } from 'tdex-protobuf/js/swap_pb';

describe('End to end testing', () => {
  const LBTC = networks.regtest.assetHash;
  const traderWallet: WalletInterface = fromWIF(
    'cSv4PQtTpvYKHjfp9qih2RMeieBQAVADqc8JGXPvA7mkJ8yD5QC1',
    networks.regtest
  );
  const app = new App();
  // Start the daemon
  beforeAll(async () => {
    try {
      // give nigiri the time to startup
      await sleep(4000);
      await app.start();
      await sleep(500);
    } catch (err) {
      app.logger.error(err.message);
    }
  });

  it('end to end', async () => {
    // Get the address of the fee service
    const feeAddress = await feeDepositAddress();
    expect(feeAddress).toStrictEqual(
      'ert1qv7qjzqg8pzda9c0g288h8jsjfsfey8gnmsr3wq'
    );
    // Fund the fee wallet
    await faucet(feeAddress);
    await faucet(feeAddress);
    // Give some time to the crawler to catchup
    await sleep(1000);

    // Get an address for creating a new market
    const marketAddress = await depositAddress();
    expect(marketAddress).toStrictEqual(
      'ert1q55ym7rly2ctjpjjedz0lv7yh5nwws6y39ctdga'
    );

    //fund the market with 1 LBTC and 6500 tokens
    await faucet(marketAddress);
    const USDT = await mint(marketAddress, 6800);
    expect(USDT).toBeDefined();

    //Give some time to the crawler to catchup
    await sleep(5000);

    const tradableMarkets = await markets();
    expect(tradableMarkets.length).toStrictEqual(1);
    const [market] = tradableMarkets;
    expect(market.baseAsset).toStrictEqual(LBTC);
    expect(market.quoteAsset).toStrictEqual(USDT);

    const { baseAsset, quoteAsset } = market;
    const balancesAndFee = await balances({ baseAsset, quoteAsset });
    expect(balancesAndFee.balances[baseAsset]).toStrictEqual(100000000);
    expect(balancesAndFee.balances[quoteAsset]).toStrictEqual(680000000000);

    const amountToBeSent = 10000;
    const amountToReceive = calculateExpectedAmount(
      balancesAndFee.balances[baseAsset],
      balancesAndFee.balances[quoteAsset],
      amountToBeSent,
      balancesAndFee.fee
    );

    // Fund trader's wallet and fetch his utxos
    await faucet(traderWallet.address);
    const traderUtxos = await fetchUtxos(traderWallet.address, LBTC);

    const emptyPsbt = Wallet.createTx();
    const psbt = traderWallet.updateTx(
      emptyPsbt,
      traderUtxos,
      amountToBeSent,
      amountToReceive,
      LBTC,
      USDT
    );

    const swap = new Swap({ chain: 'regtest' });
    const swapRequestSerialized = swap.request({
      assetToBeSent: LBTC,
      amountToBeSent: amountToBeSent,
      assetToReceive: USDT,
      amountToReceive: amountToReceive,
      psbtBase64: psbt.base64,
    });

    // 0 === Buy === receiving base_asset; 1 === sell === receiving quote_asset
    const tradeType = 1;
    const swapAcceptSerialized: Uint8Array = await tradePropose(
      market,
      tradeType,
      swapRequestSerialized
    );
    expect(swapAcceptSerialized).toBeDefined();

    // check that markets have been stopped
    expect((await markets()).length).toStrictEqual(0);

    // trader need to check the signed inputs by the provider
    // and add his own inputs if all is correct
    const swapAcceptMessage = SwapAccept.deserializeBinary(
      swapAcceptSerialized
    );
    const transaction = swapAcceptMessage.getTransaction();
    const signedPsbt = traderWallet.sign(transaction);

    // Trader  adds his signed inputs to the transaction
    const swapCompleteSerialized = swap.complete({
      message: swapAcceptSerialized,
      psbtBase64: signedPsbt,
    });

    // Trader call the tradeComplete endpoint to finalize the swap
    const txid = await tradeComplete(swapCompleteSerialized);
    expect(txid).toBeDefined();

    // check if market got back to be tradabale
    const tradableMarketsAgain = await markets();
    expect(tradableMarketsAgain.length).toStrictEqual(1);

    /**
     * Now let's try to BUY
     */

    await sleep(1000);
    const balancesAndFee2 = await balances({ baseAsset, quoteAsset });
    const amountToReceive2 = 5000;
    const amountToBeSent2 = calculateProposeAmount(
      balancesAndFee2.balances[quoteAsset],
      balancesAndFee2.balances[baseAsset],
      amountToReceive2,
      balancesAndFee.fee
    );
    const traderUtxos2 = await fetchUtxos(traderWallet.address, USDT);
    const emptyPsbt2 = Wallet.createTx();
    const psbt2 = traderWallet.updateTx(
      emptyPsbt2,
      traderUtxos2,
      amountToBeSent2,
      amountToReceive2,
      USDT,
      LBTC
    );
    const swap2 = new Swap({ chain: 'regtest' });
    const swapRequestSerialized2 = swap2.request({
      assetToBeSent: USDT,
      amountToBeSent: amountToBeSent2,
      assetToReceive: LBTC,
      amountToReceive: amountToReceive2,
      psbtBase64: psbt2.base64,
    });
    // 0 === Buy === receiving base_asset; 1 === sell === receiving quote_asset
    const tradeType2 = 0;
    const swapAcceptSerialized2: Uint8Array = await tradePropose(
      market,
      tradeType2,
      swapRequestSerialized2
    );

    // trader need to check the signed inputs by the provider
    // and add his own inputs if all is correct
    const swapAcceptMessage2 = SwapAccept.deserializeBinary(
      swapAcceptSerialized2
    );
    const transaction2 = swapAcceptMessage2.getTransaction();
    const signedPsbt2 = traderWallet.sign(transaction2);

    // Trader  adds his signed inputs to the transaction
    const swapCompleteSerialized2 = swap2.complete({
      message: swapAcceptSerialized2,
      psbtBase64: signedPsbt2,
    });

    // Trader call the tradeComplete endpoint to finalize the swap
    const txid2 = await tradeComplete(swapCompleteSerialized2);
    expect(txid2).toBeDefined();
    // check if market got back to be tradabale
    const tradableMarketsAgain2 = await markets();
    expect(tradableMarketsAgain2.length).toStrictEqual(1);
  }, 55000);

  test('Calculate expected amount', () => {
    // balanceP, balanceR, amountP, fee
    const expectedAmount = calculateExpectedAmount(
      100000000,
      650000000000,
      10000,
      0.25
    );
    expect(expectedAmount).toStrictEqual(64831026);
  });

  afterAll(async () => {
    await app.crawler.stopAll();
    await sleep(500);
    app.datastore.close();
    await app.operatorGrpc.close();
    await app.tradeGrpc.close();
  });
});
