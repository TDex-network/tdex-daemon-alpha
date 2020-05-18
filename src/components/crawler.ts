import { EventEmitter } from 'events';
import { fetchUtxosWithUrl, UtxoInterface } from '../utils';
import { Logger } from 'winston';

export enum CrawlerType {
  DEPOSIT = 'DEPOSIT',
  BALANCE = 'BALANCE',
}

export interface CrawlerInterface {
  interval: number;
  storage: any;
  timer: any;

  start(type: string, address: string, interval?: number): this;
  startAll(type: string, addresses: Array<string>, interval?: number): void;
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
  interval: number;
  storage: any;
  timer: any;

  constructor(
    private network: string,
    private explorer: string,
    private logger: Logger
  ) {
    super();

    this.interval = this.network === 'liquid' ? 60 * 1000 : 5000;
    this.storage = {};
    this.timer = {};
  }

  start(type: string, address: string, interval: number = this.interval) {
    // It's the first time we run the crawler
    if (!this.timer.hasOwnProperty(type))
      this.timer = { ...this.timer, [type]: {} };

    // We have already a crwaler running for this address
    if (this.timer[type].hasOwnProperty(address)) return this;

    //eslint-disable-next-line
    let processorFunction = () => { };
    if (type === CrawlerType.DEPOSIT)
      processorFunction = async () => await this.processDeposit(address);
    if (type === CrawlerType.BALANCE)
      processorFunction = async () => await this.processBalance(address);

    this.timer[type][address] = setInterval(processorFunction, interval);

    return this;
  }

  stop(type: string, address: string): void {
    clearInterval(this.timer[type][address]);
    delete this.timer[type][address];
  }

  startAll(type: string, addresses: Array<string>, interval?: number): void {
    addresses.forEach((a) => this.start(type, a, interval));
  }

  stopAll(): void {
    const depositTimers = this.timer[CrawlerType.DEPOSIT];
    const balanceTimers = this.timer[CrawlerType.BALANCE];
    depositTimers &&
      Object.keys(depositTimers).forEach((address) => {
        this.stop(CrawlerType.DEPOSIT, address);
      });
    balanceTimers &&
      Object.keys(balanceTimers).forEach((address) => {
        this.stop(CrawlerType.BALANCE, address);
      });
  }

  private async processBalance(address: string) {
    try {
      const fetchedUtxos = await fetchUtxosWithUrl(address, this.explorer);
      this.emit('crawler.balance', address, fetchedUtxos);
    } catch (ignore) {
      this.logger.error('[CRAWLER][BALANCE] Bad response from explorer');
    }
  }

  private async processDeposit(address: string) {
    try {
      const fetchedUtxos = await fetchUtxosWithUrl(address, this.explorer);
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
          this.start(CrawlerType.BALANCE, address);
        }
      }
    } catch (ignore) {
      this.logger.error('[CRAWLER][DEPOSIT] Bad response from explorer');
    }
  }
}
