import Datastore from 'nedb';

export type SwapSchema = {
  swapAcceptId: string;
  quoteAsset: string;
  completed: boolean;
  details?: any;
  txid?: string;
};

export default class Swaps {
  storage: Datastore<any>;
  constructor(storage: Datastore) {
    this.storage = storage;
  }

  getSwaps(query: { complete?: boolean } = {}): Promise<SwapSchema[]> {
    return new Promise<SwapSchema[]>((resolve, reject) => {
      this.storage.find(query, (err: any, docs: any[]) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  getSwap(query: {
    swapAcceptId: string;
    completed?: boolean;
  }): Promise<SwapSchema> {
    return new Promise<SwapSchema>((resolve, reject) => {
      this.storage.findOne(query, (err: any, doc: any) => {
        if (err) reject(err);
        resolve(doc);
      });
    });
  }

  addSwap(arg: SwapSchema): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.storage.insert(arg, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateSwap(query: { swapAcceptId: string }, updateQuery: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.storage.update(
        query,
        { $set: updateQuery },
        { multi: false },
        (err: any, numReplaced: any) => {
          if (err || Number(numReplaced) !== 1)
            reject(err || new Error('Update error'));
          else resolve();
        }
      );
    });
  }
}
