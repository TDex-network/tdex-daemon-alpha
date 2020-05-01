import Datastore from 'nedb';
import Swaps from '../models/swaps';
import winston from 'winston';

export default class Swap {
  static async anyPending(
    datastore: Datastore,
    logger: winston.Logger
  ): Promise<boolean> {
    try {
      const model = new Swaps(datastore);
      const swaps = await model.getSwaps({ complete: false });
      return swaps.length > 0;
    } catch (ignore) {
      logger.error(`Cannot fetch swaps from datastore`);
      return false;
    }
  }
}
