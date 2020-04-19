import Datastore from 'nedb';

export type MarketSchema = {
  fee: number;
  tradable: boolean;
  baseAsset: string;
  quoteAsset: string; // the non-base asset hash is used as the market id
  walletAddress: string;
  derivationIndex: number;
  fundingTx?: string;
};

export default class Markets {
  storage: Datastore<any>;
  constructor(storage: Datastore) {
    this.storage = storage;
    //this.storage.ensureIndex({ fieldName: 'quoteAsset', unique: true });
    //this.storage.ensureIndex({ fieldName: 'walletAddress', unique: true });
  }

  getMarkets(query: { tradable?: boolean } = {}): Promise<MarketSchema[]> {
    return new Promise<MarketSchema[]>((resolve, reject) => {
      this.storage.find(query, (err: any, docs: any[]) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  getMarket(query: {
    quoteAsset: string;
    tradable?: boolean;
  }): Promise<MarketSchema> {
    return new Promise<MarketSchema>((resolve, reject) => {
      this.storage.findOne(query, (err: any, doc: any) => {
        if (err) reject(err);
        resolve(doc);
      });
    });
  }

  getLastMarket(): Promise<MarketSchema> {
    return new Promise<MarketSchema | any>((resolve, reject) => {
      this.storage
        .find({})
        .sort({ derivationIndex: -1 })
        .limit(1)
        .exec((err: any, docs: any[]) => {
          if (err || docs.length > 1) reject(err || new Error('Read error'));
          if (docs.length === 0) resolve({ derivationIndex: Number(-1)});
          resolve(docs[0]);
        });
    });
  }

  addMarket(arg: MarketSchema): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.storage.insert(arg, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateMarket(query: { quoteAsset: string }, updateQuery: any): Promise<void> {
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
