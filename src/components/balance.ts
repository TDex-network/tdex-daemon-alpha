import Datastore from 'nedb';
import { Logger } from 'winston';
import { isValidUrl, fetchUtxosWithUrl, groupByAsset } from '../utils';
import Unspents from '../models/unspents';

export default class Balance {
  constructor(
    private datastore: Datastore,
    private explorer: string,
    private logger: Logger
  ) {
    if (!isValidUrl(this.explorer)) throw new Error('Not a valid explorer url');
  }

  async fromAsset(walletAddress: string, asset: string): Promise<any> {
    let unspents: any[] = [];
    try {
      const model = new Unspents(this.datastore);
      unspents = await model.getUnspents({
        address: walletAddress,
        asset,
        spent: false,
      });
    } catch (error) {
      try {
        unspents = await fetchUtxosWithUrl(walletAddress, this.explorer);
      } catch (error) {
        this.logger.error(
          `Error on getting unspents for address ${walletAddress}: ${error}`
        );
      }
    }

    const balance = (unspents as any)
      .map((x: { value: any }) => x.value)
      .reduce((a: number, b: number) => a + b, 0);

    return {
      [asset]: { utxos: unspents, balance },
    };
  }

  async fromMarket(
    walletAddress: string,
    { baseAsset, quoteAsset }: { baseAsset: string; quoteAsset: string }
  ): Promise<any> {
    let unspents: any[] = [];
    try {
      const model = new Unspents(this.datastore);
      unspents = await model.getUnspents({
        address: walletAddress,
        spent: false,
      });
    } catch (error) {
      try {
        unspents = await fetchUtxosWithUrl(walletAddress, this.explorer);
      } catch (error) {
        this.logger.error(
          `Error on getting unspents for address ${walletAddress}: ${error}`
        );
      }
    }

    const groupedBy = groupByAsset(unspents);
    return {
      [baseAsset]: groupedBy[baseAsset],
      [quoteAsset]: groupedBy[quoteAsset],
    };
  }
}
