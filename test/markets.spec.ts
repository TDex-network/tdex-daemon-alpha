import App from '../src/app';
import { sleep } from './helpers';
import { feeDepositAddress } from './grpc/operator';

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

  it('It start and show the deposit addresses for fee and market', async () => {
    const feeAddress = await feeDepositAddress();
    expect(feeAddress).toStrictEqual(
      'ert1qv7qjzqg8pzda9c0g288h8jsjfsfey8gnmsr3wq'
    );
  });

  afterAll(async () => {
    await app.crawler.stopAll();
    app.datastore.close();
    await app.operatorGrpc.close();
    await app.tradeGrpc.close();
  });
});
