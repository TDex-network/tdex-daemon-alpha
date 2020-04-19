import { ECPair, payments, Psbt, confidential } from 'liquidjs-lib';
//Libs
import { coinselect } from '../utils';
//Types
import { ECPairInterface } from 'liquidjs-lib/types/ecpair';
import { Network } from 'liquidjs-lib/types/networks';

export interface WalletInterface {
  keyPair: ECPairInterface;
  privateKey: string;
  publicKey: string;
  address: string;
  script: string;
  network: Network;
  updateTx(
    psbtBase64: string,
    inputs: Array<any>,
    inputAmount: number,
    outputAmount: number,
    inputAsset: string,
    outputAsset: string
  ): string;
  sign(psbtBase64: string): string;
  toHex(psbtBase64: string): string;
}

export default class Wallet implements WalletInterface {
  keyPair: ECPairInterface;
  privateKey: string;
  publicKey: string;
  address: string;
  script: string;
  network: Network;

  constructor(args: any) {
    const { keyPair }: { keyPair: ECPairInterface } = args;

    this.keyPair = keyPair;
    this.privateKey = this.keyPair.privateKey!.toString('hex');
    this.publicKey = this.keyPair.publicKey!.toString('hex');

    this.network = this.keyPair.network;
    const { address, output } = payments.p2wpkh({
      pubkey: this.keyPair.publicKey,
      network: this.network,
    });
    this.address = address!;
    this.script = output!.toString('hex');
  }

  updateTx(
    psbtBase64: string,
    inputs: Array<any>,
    inputAmount: number,
    outputAmount: number,
    inputAsset: string,
    outputAsset: string
  ): string {
    let psbt: Psbt;
    try {
      psbt = Psbt.fromBase64(psbtBase64);
    } catch (ignore) {
      throw new Error('Invalid psbt');
    }

    inputs = inputs.filter((utxo: any) => utxo.asset === inputAsset);
    const { unspents, change } = coinselect(inputs, inputAmount);

    unspents.forEach((i: any) =>
      psbt.addInput({
        // if hash is string, txid, if hash is Buffer, is reversed compared to txid
        hash: i.txid,
        index: i.vout,
        //The scriptPubkey and the value only are needed.
        witnessUtxo: {
          script: Buffer.from(this.script, 'hex'),
          asset: Buffer.concat([
            Buffer.from('01', 'hex'), //prefix for unconfidential asset
            Buffer.from(inputAsset, 'hex').reverse(),
          ]),
          value: confidential.satoshiToConfidentialValue(i.value),
          nonce: Buffer.from('00', 'hex'),
        },
      } as any)
    );

    psbt.addOutput({
      script: Buffer.from(this.script, 'hex'),
      value: confidential.satoshiToConfidentialValue(outputAmount),
      asset: Buffer.concat([
        Buffer.from('01', 'hex'), //prefix for unconfidential asset
        Buffer.from(outputAsset, 'hex').reverse(),
      ]),
      nonce: Buffer.from('00', 'hex'),
    });

    if (change > 0) {
      psbt.addOutput({
        script: Buffer.from(this.script, 'hex'),
        value: confidential.satoshiToConfidentialValue(change),
        asset: Buffer.concat([
          Buffer.from('01', 'hex'), //prefix for unconfidential asset
          Buffer.from(inputAsset, 'hex').reverse(),
        ]),
        nonce: Buffer.from('00', 'hex'),
      });
    }

    const base64 = psbt.toBase64();
    return base64;
  }

  sign(psbtBase64: string): string {
    let psbt: Psbt;
    try {
      psbt = Psbt.fromBase64(psbtBase64);
    } catch (ignore) {
      throw new Error('Invalid psbt');
    }

    const index = psbt.data.inputs.findIndex(
      (p) => p.witnessUtxo!.script.toString('hex') === this.script
    );

    psbt.signInput(index, this.keyPair);

    if (!psbt.validateSignaturesOfInput(index))
      throw new Error('Invalid signature');

    psbt.finalizeInput(index);

    return psbt.toBase64();
  }

  toHex(psbtBase64: string): string {
    let psbt: Psbt;
    try {
      psbt = Psbt.fromBase64(psbtBase64);
    } catch (ignore) {
      throw new Error('Invalid psbt');
    }

    return psbt.extractTransaction().toHex();
  }
}

export function fromWIF(wif: string, network: Network): WalletInterface {
  try {
    const keyPair = ECPair.fromWIF(wif, network);
    return new Wallet({ keyPair });
  } catch (ignore) {
    throw new Error('Invalid keypair');
  }
}
