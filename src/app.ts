import createLogger from './logger';
import winston from 'winston';
import Config, { ConfigInterface } from './config';
import DB from './datastore';
import { initVault, VaultInterface } from './vault';
import TradeServer from './grpc/tradeServer';

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

    process.on('SIGINT', () => {
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      this.shutdown();
    });
  }

  async start() {
    try {
      this.vault = await initVault(this.config.datadir);

      const wallet = this.vault.derive(0, this.config.network);
      const feeWallet = this.vault.derive(0, this.config.network, true);

      this.logger.info(
        'Deposit address for LBTC-USDT market ' + wallet.address
      );
      this.logger.info('Deposit address for fee service ' + feeWallet.address);

      const { host, port } = this.config.grpcTrader;
      this.tradeGrpc = new TradeServer(this.logger);
      this.tradeGrpc.listen(host, port);
    } catch (e) {
      this.logger.error(e.message);
    }
  }

  async shutdown() {
    this.logger.warn('Shutting down...');
    this.datastore.close();

    await this.tradeGrpc.close();

    process.exit(0);
  }
}

export default App;
