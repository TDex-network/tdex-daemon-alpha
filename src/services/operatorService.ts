import grpc from 'grpc';
import { networks } from 'liquidjs-lib';

import { OperatorService } from '../proto/operator_grpc_pb';
import {
  DepositAddressReply,
  FeeDepositAddressReply,
  FeeBalanceReply,
} from '../proto/operator_pb';
import Markets from '../models/markets';
import { DBInterface } from '../db/datastore';
import { VaultInterface } from '../components/vault';
import { CrawlerInterface, CrawlerType } from '../components/crawler';
import Balance from '../components/balance';

class Operator {
  depositsEnabled = true;

  constructor(
    private datastore: DBInterface,
    private vault: VaultInterface,
    private crawler: CrawlerInterface,
    private network: string,
    private explorer: string
  ) {}

  async depositAddress(
    _: any,
    callback: grpc.sendUnaryData<DepositAddressReply>
  ): Promise<void> {
    try {
      if (!this.depositsEnabled) {
        throw {
          code: grpc.status.UNAVAILABLE,
          name: 'NOT_ENABLED',
          message: 'Deposits are temporary disabled',
        };
      }

      const model = new Markets(this.datastore.markets);
      const latestMarket = await model.getLastMarket();
      const latestDerivationIndex = latestMarket.derivationIndex;
      const nextDerivationIndex = latestDerivationIndex + 1;
      const nextWallet = this.vault.derive(nextDerivationIndex, this.network);

      await model.addMarket({
        walletAddress: nextWallet.address,
        derivationIndex: nextDerivationIndex,
        baseAsset: '',
        quoteAsset: '',
        fee: 0,
        tradable: false,
      });

      this.crawler.start(CrawlerType.DEPOSIT, nextWallet.address);

      const reply = new DepositAddressReply();
      reply.setAddress(nextWallet.address);
      callback(null, reply);
    } catch (e) {
      return callback(e, null);
    }
  }

  async feeDepositAddress(
    _: any,
    callback: grpc.sendUnaryData<FeeDepositAddressReply>
  ): Promise<void> {
    try {
      // We use everytime the 0 index of the account 1
      const derivationIndex = 0;
      const isFeeAccount = true;
      const feeWallet = this.vault.derive(
        derivationIndex,
        this.network,
        isFeeAccount
      );

      const reply = new FeeDepositAddressReply();
      reply.setAddress(feeWallet.address);
      callback(null, reply);
    } catch (e) {
      return callback(e, null);
    }
  }

  async feeBalance(
    _: any,
    callback: grpc.sendUnaryData<FeeBalanceReply>
  ): Promise<void> {
    try {
      const derivationIndex = 0;
      const isFeeAccount = true;
      const feeWallet = this.vault.derive(
        derivationIndex,
        this.network,
        isFeeAccount
      );

      const b = new Balance(this.datastore.unspents, this.explorer);
      const bitcoinAssetHash = (networks as any)[this.network].assetHash;
      const feeAccountBalance = (
        await b.fromAsset(feeWallet.address, bitcoinAssetHash)
      )[bitcoinAssetHash].balance;

      const reply = new FeeBalanceReply();
      reply.setBalance(feeAccountBalance);
      callback(null, reply);
    } catch (e) {
      return callback(e, null);
    }
  }
}

export { Operator, OperatorService };
