import Datastore from 'nedb';
import Swaps, { SwapSchema } from '../models/swaps';
import winston from 'winston';

export default class Swap {
  static async pendingSwaps(
    datastore: Datastore,
    logger: winston.Logger
  ): Promise<SwapSchema[]> {
    try {
      const model = new Swaps(datastore);
      const swaps = await model.getSwaps({ complete: false });
      return swaps;
    } catch (ignore) {
      logger.error(`Cannot fetch swaps from datastore`);
      return [];
    }
  }
}
