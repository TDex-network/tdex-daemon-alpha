import App from '../src/app';
import { feeDepositAddress, depositAddress } from './grpc/operator';
import { sleep, faucet, mint, fetchUtxos } from './helpers';
//import { fromWIF } from '../src/components/wallet';
import { networks } from 'liquidjs-lib';
import { calculateExpectedAmount } from '../src/components/trade';
import { markets, balances, tradePropose } from './grpc/trader';
import { toSatoshi, fromSatoshi } from '../src/utils';
import Wallet, { fromWIF, WalletInterface } from '../src/components/wallet';

describe('End to end testing', () => {
  const traderWallet: WalletInterface = fromWIF(
    'cSv4PQtTpvYKHjfp9qih2RMeieBQAVADqc8JGXPvA7mkJ8yD5QC1',
    networks.regtest
  );
  const app = new App();
  const LBTC = networks.regtest.assetHash;
  // Start the daemon
  beforeAll(async () => {
    try {
      await app.start();
      await sleep(1000);
    } catch (err) {
      app.logger.error(err.message);
    }
  });

  it('Call the public markets endpoint', async () => {
    // Get the address of the fee service
    const feeAddress = await feeDepositAddress();
    expect(feeAddress).toStrictEqual(
      'ert1qv7qjzqg8pzda9c0g288h8jsjfsfey8gnmsr3wq'
    );
    // Fund the fee wallet
    await faucet(feeAddress);

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
    expect(balancesAndFee.balances[baseAsset]).toStrictEqual(toSatoshi(1));
    expect(balancesAndFee.balances[quoteAsset]).toStrictEqual(toSatoshi(6800));

    const amountToBeSent = toSatoshi(0.0001);
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
    const psbtBase64 = traderWallet.updateTx(
      emptyPsbt,
      traderUtxos,
      amountToBeSent,
      amountToReceive,
      LBTC,
      USDT
    );
    const proposal = {
      assetToBeSent: LBTC,
      amountToBeSent: fromSatoshi(amountToBeSent),
      assetToReceive: USDT,
      amountToReceive: fromSatoshi(amountToReceive),
      psbtBase64,
    };

    const swapAcceptMsg: Uint8Array = await tradePropose(market, proposal);
    expect(swapAcceptMsg).toBeDefined();
  }, 20000);

  test('Calculate expected amount', () => {
    // balanceP, balanceR, amountP, fee
    const expectedAmount = calculateExpectedAmount(
      100150000,
      649028894159,
      300000,
      0.25
    );
    expect(expectedAmount).toStrictEqual(1933518134);
  });

  afterAll(async () => {
    app.datastore.close();
    await app.crawler.stopAll();
    await app.operatorGrpc.close();
    await app.tradeGrpc.close();
  });
});
