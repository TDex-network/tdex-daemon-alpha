import App from '../src/app';
import { sleep, faucet } from './helpers';
import { feeDepositAddress, depositAddress } from './grpc/operator';
import { markets } from './grpc/trader';

describe(' Markets ', () => {
  const app = new App({
    regtest: true,
    explorer: 'http://localhost:3001',
  });

  // Start the daemon
  beforeAll(async () => {
    try {
      await app.start();
      await sleep(500);
    } catch (err) {
      app.logger.error(err.message);
    }
  });

  it('Start daemon, get the addresses for fee and market deposits', async () => {
    const feeAddress = await feeDepositAddress();
    // Fund the fee wallet
    await faucet(feeAddress);
    // we sent by "mistake" some assets to see how it works
    //await mint(feeAddress, 9000);
    //Give some time to the crawler to catchup
    await sleep(10000);

    const tradableMarkets = await markets();
    expect(tradableMarkets.length).toStrictEqual(0);

    // Get an address for creating a new market
    const marketAddress = await depositAddress();
    console.log(marketAddress);
    await sleep(500);
    // Get an address for creating a new market
    const marketAddress2 = await depositAddress();
    console.log(marketAddress2);

    await sleep(500);

    const tradableMarkets2 = await markets();
    console.log(tradableMarkets2);

    await sleep(500);

    expect(tradableMarkets2.length).toStrictEqual(0);
    //Give some time to the crawler to catchup
    //await sleep(10000);
    //expect(async () => await markets()).toThrow(TypeError);
  }, 40000);

  afterAll(async () => {
    await app.crawler.stopAll();
    app.datastore.close();
    await app.operatorGrpc.close();
    await app.tradeGrpc.close();
  });
});
