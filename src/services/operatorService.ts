import grpc from 'grpc';

import { OperatorService } from '../proto/operator_grpc_pb';
import { DepositAddressReply } from '../proto/operator_pb';
import Markets from '../models/markets';
import { DBInterface } from '../db/datastore';
import { VaultInterface } from '../components/vault';
import { CrawlerInterface } from '../components/crawler';

class Operator {
  constructor(
    private datastore: DBInterface,
    private vault: VaultInterface,
    private crawler: CrawlerInterface,
    private network: string
  ) {}

  async depositAddress(
    _: any,
    callback: grpc.sendUnaryData<DepositAddressReply>
  ): Promise<void> {
    try {
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

      this.crawler.start(nextWallet.address);

      const reply = new DepositAddressReply();
      reply.setAddress(nextWallet.address);
      callback(null, reply);
    } catch (e) {
      return callback(e, null);
    }
  }
}

export { Operator, OperatorService };
