import grpc from 'grpc';

import { OperatorService } from '../proto/operator_grpc_pb';
import { DepositAddressReply } from '../proto/operator_pb';
import Markets from '../models/markets';
import { DBInterface } from '../db/datastore';
import { VaultInterface } from '../components/vault';

class Operator {
  constructor(
    private datastore: DBInterface,
    private vault: VaultInterface,
    private crawler: any,
    private network: string,
    private defaultMarket: any
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
        baseAsset: this.defaultMarket.baseAsset[this.network],
        quoteAsset: '',
        fee: this.defaultMarket.fee,
        tradable: false,
      });

      console.log(this.crawler);

      const reply = new DepositAddressReply();
      reply.setAddress(nextWallet.address);
      callback(null, reply);
    } catch (e) {
      return callback(e, null);
    }
  }
}

export { Operator, OperatorService };
