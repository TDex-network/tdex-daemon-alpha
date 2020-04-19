import { SafePick, fetchBalances } from '../utils';

export default class Market {
  depositAddress!: string;
  baseAsset!: string;
  quoteAsset!: string;
  fee?: number = 0.25;
  tradable?: boolean = false;

  constructor(data?: SafePick<Market>) {
    Object.assign(this, data);
  }

  getPair(): Record<string, any> {
    const { baseAsset, quoteAsset } = this;
    return {
      baseAsset,
      quoteAsset,
    };
  }

  async getBalances(): Promise<any> {
    const { balances } = await fetchBalances(this.depositAddress);
    return balances;
  }
}
