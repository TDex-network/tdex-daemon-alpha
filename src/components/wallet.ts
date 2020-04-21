import {
  ECPair,
  payments,
  Psbt,
  confidential,
  Transaction,
} from 'liquidjs-lib';
//Libs
import { coinselect, calculateFees } from '../utils';
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
  payFees(psbtBase64: string, utxos: Array<any>): string;
  sign(psbtBase64: string): string;
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

    return psbt.toBase64();
  }

  payFees(psbtBase64: string, utxos: any[]): string {
    const psbt = Psbt.fromBase64(psbtBase64);
    const tx = Transaction.fromBuffer(psbt.data.getTransaction());
    const { fees } = calculateFees(tx.ins.length + 1, tx.outs.length + 2);
    const encodedAsset = Buffer.concat([
      Buffer.alloc(1, 1),
      Buffer.from(this.network.assetHash, 'hex').reverse(),
    ]);

    const { unspents, change } = coinselect(utxos, fees);
    unspents.forEach((input) =>
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        witnessUtxo: {
          nonce: Buffer.from('00', 'hex'),
          value: confidential.satoshiToConfidentialValue(input.value),
          script: Buffer.from(this.script, 'hex'),
          asset: encodedAsset,
        },
      } as any)
    );

    psbt.addOutput({
      asset: encodedAsset,
      script: Buffer.alloc(0),
      value: confidential.satoshiToConfidentialValue(fees),
      nonce: Buffer.alloc(1, 0),
    });

    if (change > 0) {
      psbt.addOutput({
        asset: encodedAsset,
        script: Buffer.from(this.script, 'hex'),
        value: confidential.satoshiToConfidentialValue(change),
        nonce: Buffer.alloc(1, 0),
      });
    }

    return psbt.toBase64();
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

    return psbt.toBase64();
  }

  static toHex(psbtBase64: string): string {
    let psbt: Psbt;
    try {
      psbt = Psbt.fromBase64(psbtBase64);
    } catch (ignore) {
      throw new Error('Invalid psbt');
    }

    //Let's finalize all inputs
    psbt.validateSignaturesOfAllInputs();
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  }

  static createTx(): string {
    const psbt = new Psbt();
    return psbt.toBase64();
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
