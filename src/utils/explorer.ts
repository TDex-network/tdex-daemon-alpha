import axios from 'axios';
import { URL } from 'url';

export const EXPLORER_URL = {
  liquid: 'https://blockstream.info/liquid/api',
  regtest: 'https://nigiri.network/liquid/api',
};

export interface UtxoInterface {
  txid: string;
  vout: number;
  asset: string;
  value: number;
  script?: string;
}

export function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
}

export function groupByAsset(data: any[]): any {
  return data.reduce(
    (
      storage: { [x: string]: { [x: string]: any[] } },
      item: { [x: string]: any; value: any }
    ) => {
      // get the first instance of the key by which we're grouping
      const group = item['asset'];

      // set `storage` for this instance of group to the outer scope (if not empty) or initialize it
      if (storage.hasOwnProperty(group)) {
        storage[group]['balance'] = storage[group]['balance'];
        storage[group]['utxos'] = storage[group]['utxos'];
      } else {
        storage = { ...storage, [group]: { balance: 0, utxos: [] } };
      }

      // add this item to its group within `storage`
      storage[group]['balance'] += item.value;
      storage[group]['utxos'].push(item);

      // return the updated storage to the reduce function, which will then loop through the next
      return storage;
    },
    {}
  );
}

export async function fetchUtxosWithUrl(
  address: string,
  url: string,
  asset?: string
): Promise<Array<UtxoInterface>> {
  const allUtxos = (await axios.get(`${url}/address/${address}/utxo`)).data;
  if (!asset) return allUtxos;

  return allUtxos.filter(function (utxo: { asset: any }) {
    return utxo.asset === asset;
  });
}

export async function pushTx(hex: string, url: string): Promise<any> {
  let result;
  try {
    result = await axios.post(`${url}/tx`, hex, {
      headers: { 'Content-Type': 'text/plain' },
    });

    return result.data;
  } catch (error) {
    // Error 😨
    if (error.response) {
      /*
       * The request was made and the server responded with a
       * status code that falls out of the range of 2xx
       */
      throw new Error(error.response.data);
    } else if (error.request) {
      /*
       * The request was made but no response was received, `error.request`
       * is an instance of XMLHttpRequest in the browser and an instance
       * of http.ClientRequest in Node.js
       */
      throw new Error(error.request);
    } else {
      // Something happened in setting up the request and triggered an Error
      throw new Error(error.message);
    }
  }
}
