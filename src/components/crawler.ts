import { EventEmitter } from 'events';
import { fetchUtxos, UtxoInterface, isValidNetwork } from '../utils';

export enum CrawlerType {
  DEPOSIT = 'DEPOSIT',
  BALANCE = 'BALANCE',
}

export interface CrawlerInterface {
  running: boolean;
  storage: any;
  timer: any;

  start(type: string, address: string, interval?: number): this;
  stop(type: string, address: string): void;
  stopAll(): void;

  on(
    event: 'crawler.deposit',
    listener: (address: string, pair: Array<UtxoInterface>) => void
  ): this;

  on(
    event: 'crawler.balance',
    listener: (address: string, utxos: Array<UtxoInterface>) => void
  ): this;
}

export default class Crawler extends EventEmitter implements CrawlerInterface {
  running: boolean;
  storage: any;
  timer: any;

  constructor(private network: string) {
    super();

    if (!isValidNetwork(this.network))
      throw new Error('Network not support by the explorer');

    this.running = false;
    this.storage = {};
    this.timer = {};
  }

  start(type: string, address: string, interval = 200) {
    if (this.running) return this;

    this.running = true;

    if (!this.timer.hasOwnProperty(type))
      this.timer = { ...this.timer, [type]: {} };

    //eslint-disable-next-line
    let processorFunction = () => {};
    if (type === CrawlerType.DEPOSIT)
      processorFunction = async () => await this.processDeposit(address);
    if (type === CrawlerType.BALANCE)
      processorFunction = async () => await this.processBalance(address);

    this.timer[type][address] = setInterval(processorFunction, interval);

    return this;
  }

  stop(type: string, address: string): void {
    this.running = false;
    clearInterval(this.timer[type][address]);
    delete this.timer[type][address];
  }

  stopAll(): void {
    Object.keys(this.timer).forEach((type) => {
      Object.keys(type).forEach((address) => {
        this.stop(type, address);
      });
    });
  }

  private async processBalance(address: string) {
    const fetchedUtxos = await fetchUtxos(address, this.network);
    this.emit('crawler.balance', address, fetchedUtxos);
  }

  private async processDeposit(address: string) {
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
        this.stop(CrawlerType.DEPOSIT, address);
      }
    }
  }
}
