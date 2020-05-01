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
import Balance from './components/balance';

// Swaps have an average size of 850 bytes.
// The lower bound of the fee account balance is set to
// be able to top up fees for at least 5 swaps.
const FEE_AMOUNT_LIMIT = 4500;

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
          try {
            await Unspent.fromUtxos(
              walletAddress,
              utxos,
              this.datastore.unspents,
              this.logger
            );

            if (walletAddress === walletOfFeeAccount.address) {
              const { explorer, market, network } = this.config;
              const balance = new Balance(
                this.datastore.unspents,
                explorer[network]
              );

              const lbtc = market.baseAsset[network];
              const lbtcBalance = (
                await balance.fromAsset(walletAddress, lbtc)
              )[lbtc].balance;

              if (
                (this.tradeGrpc.server as any).started &&
                lbtcBalance < FEE_AMOUNT_LIMIT
              ) {
                await this.disableTradesAndDeposits();
              }
              if (
                !(this.tradeGrpc.server as any).started &&
                lbtcBalance >= FEE_AMOUNT_LIMIT
              ) {
                await this.enableTradesAndDeposits();
              }
            }
          } catch (e) {
            console.error(e);
            this.logger.error(e.Error());
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

  async disableTradesAndDeposits(): Promise<void> {
    this.logger.warn(
      'Fee account balance too low.\n' +
        'Shutting down trade server and disabling DepositAddress rpc.\n' +
        'You must send funds to the fee account address in order to restore them.'
    );
    this.operatorGrpc.operatorService.depositsEnabled = false;
    await this.tradeGrpc.close();
  }

  async enableTradesAndDeposits(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.info(
        'New funds detected for fee acccount.\n' +
          'Restoring trade server and deposits.'
      );
      const { grpcTrader } = this.config;
      this.tradeGrpc.listen(grpcTrader.host, grpcTrader.port);
      this.operatorGrpc.operatorService.depositsEnabled = true;
      resolve();
    });
  }
}

export default App;
