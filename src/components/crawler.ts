import { EventEmitter } from 'events';
import { fetchUtxos, UtxoInterface, isValidNetwork } from '../utils';

export interface CrawlerInterface {
  running: boolean;
  storage: any;
  timer: any;

  start(address: string): this;
  stop(address: string): void;
  stopAll(): void;

  on(
    event: 'crawler.deposit',
    listener: (address: string, pair: Array<UtxoInterface>) => void
  ): this;
}

export default class Crawler extends EventEmitter implements CrawlerInterface {
  running: boolean;
  storage: any;
  timer: any;

  constructor(private network: string, private interval: number = 200) {
    super();

    if (!isValidNetwork(this.network))
      throw new Error('Network not support by the explorer');

    this.running = false;
    this.storage = {};
    this.timer = {};
  }

  start(address: string) {
    if (this.running) return this;

    this.running = true;

    this.timer[address] = setInterval(
      async () => await this.process(address),
      this.interval
    );

    return this;
  }

  stop(address: string): void {
    this.running = false;
    clearInterval(this.timer[address]);
    delete this.timer[address];
  }

  stopAll(): void {
    Object.keys(this.timer).forEach((key) => {
      this.stop(key);
    });
  }

  private async process(address: string) {
    const fetchedUtxos = await fetchUtxos(address, this.network);

    if (!this.storage.hasOwnProperty(address)) this.storage[address] = [];

    const storageByAddress = this.storage[address];

    const toAdd: Array<UtxoInterface> = fetchedUtxos.filter(
      (utxo: UtxoInterface) => {
        const exist = storageByAddress.some(
          (s: { txid: string; vout: number }) =>
            s.txid === utxo.txid && s.vout === utxo.vout
        );
        return !exist;
      }
    );

    if (toAdd.length === 2) {
      const [first, second] = toAdd;
      if (first.asset !== second.asset) {
        this.storage[address].push(first, second);
        this.emit('crawler.deposit', address, [first, second]);
        this.stop(address);
      }
    }
  }
}
