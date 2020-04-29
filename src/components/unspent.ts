import Datastore from 'nedb';
import winston from 'winston';
import { UtxoInterface } from '../utils';
import Unspents from '../models/unspents';

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
}
