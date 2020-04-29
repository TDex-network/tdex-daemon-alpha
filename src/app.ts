import winston from 'winston';

import DB from './db/datastore';
import createLogger from './logger';
import TradeServer from './grpc/tradeServer';
import OperatorServer from './grpc/operatorServer';
import Config, { ConfigInterface } from './config';
import { initVault, VaultInterface } from './components/vault';
import Market from './components/market';
import Unspent from './components/unspent';
import Crawler, { CrawlerInterface, CrawlerType } from './components/crawler';
import { UtxoInterface } from './utils';

class App {
  logger: winston.Logger;
  config: ConfigInterface;
  vault!: VaultInterface;
  tradeGrpc!: TradeServer;
  operatorGrpc!: OperatorServer;
  datastore: DB;
  crawler: CrawlerInterface;

  constructor() {
    this.logger = createLogger();
    this.config = Config();
    this.datastore = new DB(this.config.datadir);
    this.crawler = new Crawler(this.config.network);

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

      this.crawler.on(
        'crawler.deposit',
        async (walletAddress: string, pair: Array<UtxoInterface>) => {
          const { market, network } = this.config;
          await Market.fromFundingUtxos(
            walletAddress,
            pair,
            this.datastore.markets,
            this.logger,
            {
              baseAsset: market.baseAsset[network],
              fee: market.fee,
            }
          );
          this.crawler.start(
            CrawlerType.BALANCE,
            walletAddress,
            network === 'liquid' ? 60 * 1000 : 200
          );
        }
      );

      this.crawler.on(
        'crawler.balance',
        async (walletAddress: string, utxos: Array<UtxoInterface>) => {
          await Unspent.fromUtxos(
            walletAddress,
            utxos,
            this.datastore.unspents,
            this.logger
          );
        }
      );

      this.operatorGrpc = new OperatorServer(
        this.datastore,
        this.vault,
        this.crawler,
        this.config.network,
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

    await this.crawler.stopAll();
    await this.tradeGrpc.close();
    await this.operatorGrpc.close();

    process.exit(0);
  }
}

export default App;
