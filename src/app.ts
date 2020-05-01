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
import { UtxoInterface, FEE_AMOUNT_LIMIT } from './utils';
import Balance from './components/balance';
import Swaps from './models/swaps';

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
    this.crawler = new Crawler(
      this.config.network,
      this.config.explorer[this.config.network]
    );

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

          try {
            if (walletAddress === walletOfFeeAccount.address) {
              const { explorer, market, network } = this.config;
              const balance = new Balance(
                this.datastore.unspents,
                explorer[network],
                this.logger
              );

              const lbtc = market.baseAsset[network];
              const lbtcBalance = (
                await balance.fromAsset(walletAddress, lbtc)
              )[lbtc].balance;
              const allTradableMarkets = await Market.areAllTradable(
                this.datastore.markets,
                this.logger
              );
              const swapModel = new Swaps(this.datastore.swaps);
              const pendingSwaps = (await swapModel.getSwaps).length > 0;

              if (allTradableMarkets && lbtcBalance < FEE_AMOUNT_LIMIT) {
                this.logger.warn(
                  'Fee account balance too low.\n' +
                    'Trades and deposits will be disbaled.\n' +
                    `You must send funds to the fee account address (${walletAddress}) in order to restore them.`
                );
                await Market.updateAllTradableStatus(
                  false,
                  this.datastore.markets,
                  this.logger
                );
              }
              if (
                !allTradableMarkets &&
                !pendingSwaps &&
                lbtcBalance >= FEE_AMOUNT_LIMIT
              ) {
                await Market.updateAllTradableStatus(
                  true,
                  this.datastore.markets,
                  this.logger
                );
              }
            }
          } catch (e) {
            console.error(e);
            this.logger.error(
              `Error while checking balance for fee account: ${e}`
            );
          }
        }
      );

      const walletOfMarkets = await Market.getWallets(
        this.datastore.markets,
        this.logger
      );
      const walletOfFeeAccount = this.vault.derive(
        0,
        this.config.network,
        true
      );
      this.crawler.startAll(
        CrawlerType.BALANCE,
        walletOfMarkets.concat(walletOfFeeAccount.address)
      );

      this.operatorGrpc = new OperatorServer(
        this.datastore,
        this.vault,
        this.crawler,
        this.config.network,
        this.config.explorer[this.config.network],
        this.logger
      );
      this.tradeGrpc = new TradeServer(
        this.datastore,
        this.vault,
        this.config.network,
        this.config.explorer[this.config.network],
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
