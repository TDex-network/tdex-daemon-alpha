import createLogger from './logger';
import winston from 'winston';
import Config, { ConfigInterface } from './config';
import DB from './datastore';
import { initVault, VaultInterface } from './vault';

class App {
  logger: winston.Logger;
  config: ConfigInterface;
  vault?: VaultInterface;
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
      this.logger.info(wallet.address);
    } catch (e) {
      this.logger.error(e.message);
    }
  }

  shutdown() {
    this.logger.warn('Shutting down...');
    process.exit(0);
  }
}

export default App;
