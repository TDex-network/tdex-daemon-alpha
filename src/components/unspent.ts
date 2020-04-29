import Datastore from 'nedb';
import winston from 'winston';
import { UtxoInterface } from '../utils';
import Unspents from '../models/unspents';

export interface OutpointInterface {
  txid: string;
  vout: number;
}

export default class Unspent {
  static async fromUtxos(
    address: string,
    utxos: Array<UtxoInterface>,
    datastore: Datastore,
    logger: winston.Logger
  ) {
    try {
      const model = new Unspents(datastore);
      utxos.forEach(async (utxo: UtxoInterface) => {
        const found = await model.getUnspent({
          txid: utxo.txid,
          vout: utxo.vout,
        });
        if (!found) {
          await model.addUnspent({
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.value,
            asset: utxo.asset,
            address: address,
            spent: false,
          });
          logger.info(
            `New unspent found for address ${address} | Value: ${
              utxo.value
            } | Asset (prefix): ${utxo.asset.substring(0, 4)}`
          );
        }
      });
    } catch (e) {
      const outpoints = utxos.map((u) => `${u.txid}:${u.vout}`);
      logger.error(
        `Error on updating unspents for address ${address} when inserting ${outpoints}`
      );
    }
  }

  static async lock(
    outpoints: Array<OutpointInterface>,
    swapId: string,
    datastore: Datastore
  ): Promise<boolean> {
    try {
      const model = new Unspents(datastore);
      const promises = outpoints.map((op) =>
        model.updateUnspent(op, { spent: true, spentBy: swapId })
      );
      await Promise.all(promises);
      return true;
    } catch (ignore) {
      return false;
    }
  }

  static async unlock(swapId: string, datastore: Datastore): Promise<boolean> {
    try {
      const model = new Unspents(datastore);
      await model.updateUnspents(
        { spentBy: swapId },
        { spent: false, spentBy: '' }
      );
      return true;
    } catch (ignore) {
      return false;
    }
  }
}
