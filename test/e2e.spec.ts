import App from '../src/app';
import { fromWIF } from '../src/components/wallet';
import { networks } from 'liquidjs-lib';
import { calculateExpectedAmount } from '../src/components/trade';


describe('End to end testing', () => {
  
  const app = new App();
  // Start the daemon
  beforeAll(async () => {
    try {
      await app.start();
    } catch (err) {
      app.logger.error(err.message);
    }
  }, 5000);


  it('Call the public markets endpoint', async () => {
    const traderWallet = fromWIF("cSv4PQtTpvYKHjfp9qih2RMeieBQAVADqc8JGXPvA7mkJ8yD5QC1", networks.regtest);
    
  })

  test('Calculate expected amount', () => {
    // balanceP, balanceR, amountP, fee
    const expectedAmount = calculateExpectedAmount(100150000, 649028894159, 300000, 0.25);
    expect(expectedAmount).toStrictEqual(1933518134);
  })
  test(' Create a wallet', async () => {
    // defy aim rib lawsuit top intact begin liberty survey poverty demise guide
    const wallet = fromWIF('cSv4PQtTpvYKHjfp9qih2RMeieBQAVADqc8JGXPvA7mkJ8yD5QC1', networks.regtest);
    expect(wallet.address).toStrictEqual('ert1qgcst5xjdlsdhhpgrkdlfa04v7e6hy2h60g5rpf')
  })
})

