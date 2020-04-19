import winston from 'winston';

import DB from './db/datastore';
import createLogger from './logger';
import TradeServer from './grpc/tradeServer';
import OperatorServer from './grpc/operatorServer';
import Config, { ConfigInterface } from './config';
import { initVault, VaultInterface } from './components/vault';

class App {
  logger: winston.Logger;
  config: ConfigInterface;
  vault!: VaultInterface;
  tradeGrpc!: TradeServer;
  operatorGrpc!: OperatorServer;
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

      this.operatorGrpc = new OperatorServer(
        this.datastore,
        this.vault,
        {},
        this.config.network,
        this.config.market,
        this.logger
      );
      this.tradeGrpc = new TradeServer(
        this.datastore,
        this.vault,
        this.config.network,
        this.logger
      );
      const { grpcTrader, grpcOperator } = this.config;
      this.tradeGrpc.listen(grpcTrader.host, grpcTrader.port);
      this.operatorGrpc.listen(grpcOperator.host, grpcOperator.port);
    } catch (e) {
      console.error(e);
      this.logger.error(e.message);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.warn('Shutting down...');
    this.datastore.close();

    await this.tradeGrpc.close();
    await this.operatorGrpc.close();

    process.exit(0);
  }
}

export default App;
