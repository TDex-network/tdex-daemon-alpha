import Datastore from 'nedb';
import * as path from 'path';

export interface DBInterface {
  datadir: string;
  markets: Datastore<any>;
  swaps: Datastore<any>;
  unspents: Datastore<any>;
  spendings: Datastore<any>;
}

export default class DB implements DBInterface {
  datadir: string;
  markets: Datastore<any>;
  swaps: Datastore<any>;
  unspents: Datastore<any>;
  spendings: Datastore<any>;

  constructor(datadir: string) {
    const absoluteDatadir = path.resolve(datadir);

    this.datadir = absoluteDatadir;

    this.markets = new Datastore({
      filename: path.join(absoluteDatadir, 'markets.db'),
      autoload: true,
    });

    this.swaps = new Datastore({
      filename: path.join(absoluteDatadir, 'swaps.db'),
      autoload: true,
    });

    this.unspents = new Datastore({
      filename: path.join(absoluteDatadir, 'unspents.db'),
      autoload: true,
    });

    this.spendings = new Datastore({
      filename: path.join(absoluteDatadir, 'spendings.db'),
      autoload: true,
    });
  }

  close(): void {
    this.markets.removeAllListeners();
    this.swaps.removeAllListeners();
    this.unspents.removeAllListeners();
    this.spendings.removeAllListeners();
  }
}
