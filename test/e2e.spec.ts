//import App from '../src/app';
import { fromWIF } from '../src/components/wallet';
import { networks } from 'liquidjs-lib';
import { calculateExpectedAmount } from '../src/components/trade';


describe('End to end testing', () => {

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

