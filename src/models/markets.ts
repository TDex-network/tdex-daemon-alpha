import Datastore from 'nedb';

export type MarketSchema = {
  fee: number;
  tradable: boolean;
  baseAsset: string;
  quoteAsset: string; // the non-base asset hash is used as the market id
  walletAddress: string;
  derivationIndex: number;
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
      this.storage.update(query, { $set: updateQuery }, {}, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
