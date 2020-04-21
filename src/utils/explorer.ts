import axios from 'axios';
import { URL } from "url";



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

export function isValidNetwork(n: string) {
  const availableNetworks = Object.keys(EXPLORER_URL);
  return availableNetworks.includes(n);
}

const isValidUrl = (s: string) => {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
};

function urlFromNetwork(n: string): string {
  const { EXPLORER } = process.env;
  if (EXPLORER)
    if (isValidUrl(EXPLORER))
      return EXPLORER;
    else 
      throw new Error('Not a valid explorer URL');


  if (!isValidNetwork(n))
    throw new Error('Network not support by the explorer');

  return (EXPLORER_URL as any)[n];
}

export async function fetchUtxos(
  address: string,
  network: string,
  asset?: string
): Promise<Array<UtxoInterface>> {
  const url = urlFromNetwork(network);
  const allUtxos = (await axios.get(`${url}/address/${address}/utxo`)).data;
  if (!asset) return allUtxos;

  return allUtxos.filter(function (utxo: { asset: any }) {
    return utxo.asset === asset;
  });
}

export async function fetchBalances(
  address: string,
  network: string
): Promise<any> {
  const fetchedData = await fetchUtxos(address, network);
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

export async function pushTx(hex: string, network: string): Promise<any> {
  const url = urlFromNetwork(network);
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
