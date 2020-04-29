import Datastore from 'nedb';

export type UnspentSchema = {
  txid: string;
  vout: number;
  asset: string;
  value: number;
  address: string;
  spent: boolean;
  spentBy?: string;
};

export default class Unspents {
  storage: Datastore<any>;
  constructor(storage: Datastore) {
    this.storage = storage;
  }

  getUnspents(
    query: { address?: string; spent?: boolean; asset?: string } = {}
  ): Promise<UnspentSchema[]> {
    return new Promise<UnspentSchema[]>((resolve, reject) => {
      this.storage.find(query, (err: any, docs: any[]) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  getUnspent(query: {
    txid: string;
    vout: number;
    spent?: boolean;
  }): Promise<UnspentSchema> {
    return new Promise<UnspentSchema>((resolve, reject) => {
      this.storage.findOne(query, (err: any, doc: any) => {
        if (err) reject(err);
        resolve(doc);
      });
    });
  }

  addUnspent(arg: UnspentSchema): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.storage.insert(arg, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateUnspent(
    query: {
      txid: string;
      vout: number;
    },
    updateQuery: any
  ): Promise<void> {
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

  updateUnspents(
    query: {
      spentBy: string;
    },
    updateQuery: any
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.storage.update(
        query,
        { $set: updateQuery },
        { multi: true },
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}
