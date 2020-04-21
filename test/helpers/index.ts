import axios from 'axios';
// Nigiri Chopstick Liquid base URI 
const APIURL = `http://localhost:3001`


function prepareVaultConfig() {
  return JSON.stringify({"keystore": {"value": "thunder plunge flower caution swap cake dice master spatial gadget horn solar law scale tree update area stem odor evolve famous journey hunt symbol", "isEncrypted": false}});
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function bufferFromAssetHash(hash: string) {
  return Buffer.concat([
    Buffer.from('01', 'hex'), //prefix for unconfidential asset
    Buffer.from(hash, 'hex').reverse(),
  ]);
}

function utxosByAsset(utxos: any[], asset: any) {
  return utxos.filter(function (utxo) {
    return utxo.asset === asset
  })
}

async function faucet(address: any) {
  await axios.post(`${APIURL}/faucet`, { address });
  await sleep(200)
}

async function mint(address: any, quantity: number): Promise<string> {
  const response = await axios.post(`${APIURL}/mint`, { address, quantity });
  await sleep(200)
  const { asset } = response.data;
  return asset;
}

async function fetchUtxos(address: any, asset: any): Promise<Array<any>> {
  await sleep(2000)
  const utxos = (await axios.get(`${APIURL}/address/${address}/utxo`)).data;
  return utxosByAsset(utxos, asset);
}

async function pushTx(hex: any): Promise<string> {

  let result
  try {
    result = await axios.post(
      `${APIURL}/tx`,
      hex,
      { headers: { 'Content-Type': 'text/plain' } }
    );

    return result.data.txId;
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


export {
  mint,
  sleep,
  faucet,
  pushTx,
  fetchUtxos,
  prepareVaultConfig,
  bufferFromAssetHash,
}