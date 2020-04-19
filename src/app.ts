import winston from 'winston';

import DB from './db/datastore';
import createLogger from './logger';
import TradeServer from './grpc/tradeServer';
//import Markets from './models/markets';
import Config, { ConfigInterface } from './config';
import { initVault, VaultInterface } from './core/vault';
import Markets from './models/markets';

class App {
  logger: winston.Logger;
  config: ConfigInterface;
  vault!: VaultInterface;
  tradeGrpc!: TradeServer;
  datastore: any;

  constructor() {
    this.logger = createLogger();
    this.config = Config();
    this.datastore = new DB(this.config.datadir);

    process.on('SIGINT', async () => {
      await this.shutdown();
    });

    process.on('SIGTERM', async () => {
      await this.shutdown();
    });
  }

  async start() {
    try {
      this.vault = await initVault(this.config.datadir);

      //const wallet = this.vault.derive(0, this.config.network);
      const feeWallet = this.vault.derive(0, this.config.network, true);

      this.logger.info('Deposit address for fee service ' + feeWallet.address);

      const model = new Markets(this.datastore.markets);

      /* await model.addMarket({ 
        walletAddress: wallet.address,
        derivationIndex: 1,
        baseAsset: this.config.market.baseAsset[this.config.network],
        quoteAsset: '8b29b105ee36ef568cbc271c0b9636c3af68aad759ad5113917861ae66602052',
        fee: this.config.market.fee,
        tradable: true 
      }); */
      console.log(await model.getMarkets());

      const { host, port } = this.config.grpcTrader;
      this.tradeGrpc = new TradeServer(
        this.datastore,
        this.vault,
        this.config.network,
        this.logger
      );
      this.tradeGrpc.listen(host, port);
    } catch (e) {
      console.error(e);
      this.logger.error(e.message);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.warn('Shutting down...');
    this.datastore.close();

    await this.tradeGrpc.close();

    process.exit(0);
  }
}

export default App;
