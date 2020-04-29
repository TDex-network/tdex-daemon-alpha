import Datastore from 'nedb';
import { UtxoInterface } from '../utils';
import Markets from '../models/markets';
import winston from 'winston';

export default class Market {
  static async fromFundingUtxos(
    walletAddress: string,
    fundingUtxos: Array<UtxoInterface>,
    datastore: Datastore,
    logger: winston.Logger,
    { baseAsset, fee }: { baseAsset: string; fee: number }
  ) {
    const [first, second] = fundingUtxos;
    const quoteAsset = first.asset !== baseAsset ? first.asset : second.asset;
    const baseFundingTx = first.asset === baseAsset ? first.txid : second.txid;
    const quoteFundingTx = first.asset !== baseAsset ? first.txid : second.txid;

    try {
      const model = new Markets(datastore);
      await model.updateMarketByWallet(
        { walletAddress },
        {
          baseAsset,
          quoteAsset,
          baseFundingTx,
          quoteFundingTx,
          fee,
          tradable: true,
        }
      );
      logger.info(
        `New deposit for market ${quoteAsset} on address ${walletAddress}`
      );
    } catch (ignore) {
      logger.error(
        `Error on creation market ${quoteAsset} on address ${walletAddress}`
      );
    }
  }
}
