import axios from 'axios';

export const EXPLORER_URL = {
  liquid: 'https://blockstream.info/liquid/api',
  regtest: 'https://nigiri.network/liquid/api',
};

interface UtxoInterface {
  txid: string;
  vout: number;
  asset: string;
  value: number;
  script?: string;
}

export async function fetchUtxos(
  address: string,
  url: string
): Promise<Array<UtxoInterface>> {
  return (await axios.get(`${url}/address/${address}/utxo`)).data;
}

export async function fetchBalances(
  address: string,
  url: string = EXPLORER_URL.regtest
): Promise<any> {
  const fetchedData = await fetchUtxos(address, url);
  const balances = fetchedData.reduce(
    (storage: { [x: string]: any }, item: { [x: string]: any; value: any }) => {
      // get the first instance of the key by which we're grouping
      const group = item['asset'];

      // set `storage` for this instance of group to the outer scope (if not empty) or initialize it
      storage[group] = storage[group] || 0;

      // add this item to its group within `storage`
      storage[group] += item.value;

      // return the updated storage to the reduce function, which will then loop through the next
      return storage;
    },
    {}
  ); // {} is the initial value of the storage

  const utxos = fetchedData.reduce(
    (storage: { [x: string]: any }, item: { [x: string]: any; value: any }) => {
      // get the first instance of the key by which we're grouping
      const group = item['asset'];

      // set `storage` for this instance of group to the outer scope (if not empty) or initialize it
      storage[group] = storage[group] || [];

      // add this item to its group within `storage`
      storage[group].push(item);

      // return the updated storage to the reduce function, which will then loop through the next
      return storage;
    },
    {}
  ); // {} is the initial value of the storage

  return {
    balances,
    utxos,
  };
}
