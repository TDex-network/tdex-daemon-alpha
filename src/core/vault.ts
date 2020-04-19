import * as fs from 'fs';
import * as path from 'path';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import { encrypt, decrypt } from '../utils';
import { networks } from 'liquidjs-lib';
import { fromWIF, WalletInterface } from './wallet';

//eslint-disable-next-line
const enquirer = require('enquirer');

export interface VaultInterface {
  filepath: string;
  keystore: string;
  isEncrypted: boolean;
  derive(
    index: number,
    network: string,
    isFeeAccount?: boolean,
    isChange?: boolean
  ): WalletInterface;
}

export default class Vault implements VaultInterface {
  filepath: any;
  keystore: string;
  isEncrypted: boolean;

  constructor(filepath: string, keystore: string, isEncrypted: boolean) {
    if (!fs.existsSync(filepath))
      throw new Error('Vault storage file not found');

    this.keystore = keystore;
    this.filepath = filepath;
    this.isEncrypted = isEncrypted;
  }

  derive(
    index: number,
    network: string,
    isFeeAccount = false,
    isChange = false
  ): WalletInterface {
    const coinType = network === 'liquid' ? 0 : 1;
    const change = !isChange ? 0 : 1;
    const account = !isFeeAccount ? 0 : 1;
    const derivationPath = `m/84'/${coinType}'/${account}'/${change}/${index}`;

    let mnemonic;
    if (this.isEncrypted) {
      try {
        mnemonic = decrypt(this.keystore, process.env.TDEX_PASSWORD!);
      } catch (e) {
        throw new Error('TDEX_PASSWORD is either missing or wrong');
      }
    } else {
      mnemonic = this.keystore;
    }
    const networkObject = (networks as any)[network];
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const masterNode = bip32.fromSeed(seed, networkObject);
    const childNode = masterNode.derivePath(derivationPath);
    return fromWIF(childNode.toWIF(), networkObject);
  }
}

const type = new enquirer.Select({
  type: 'select',
  name: 'type',
  message: 'How do you want to store your seed? 🔑',
  choices: [
    { name: 'encrypted', message: 'Encrypted (AES-128-CBC)' }, //<= choice object
    { name: 'plain', message: 'Plain Text (not recommended)' }, //<= choice object
  ],
});

const password = new enquirer.Password({
  type: 'password',
  name: 'password',
  message: 'Type your password',
});

async function generateSeedAndSave(filepath: string): Promise<void> {
  const storageType: string = await type.run();

  let mnemonic = bip39.generateMnemonic(256);
  while (!bip39.validateMnemonic(mnemonic))
    mnemonic = bip39.generateMnemonic(256);

  let isEncrypted;
  let value: string;
  if (storageType === 'encrypted') {
    const selectedPassword = await password.run();
    value = encrypt(mnemonic, selectedPassword);
    isEncrypted = true;
  } else {
    value = mnemonic;
  }

  fs.writeFileSync(
    filepath,
    JSON.stringify(
      {
        keystore: {
          isEncrypted,
          value,
        },
      },
      undefined,
      2
    ),
    { encoding: 'utf8', flag: 'w' }
  );

  if (isEncrypted) {
    console.log(
      'Wallet created! Restart the daemon exporting the env variable TDEX_PASSWORD'
    );
    console.log('Shutting down...');
    process.exit(0);
  }
}

export async function initVault(datadir: string): Promise<VaultInterface> {
  const vaultPath = path.join(datadir, 'vault.json');
  if (!fs.existsSync(vaultPath)) await generateSeedAndSave(vaultPath);

  const read = fs.readFileSync(vaultPath, 'utf8');
  let deserialized: any;
  try {
    deserialized = JSON.parse(read);
  } catch (e) {
    throw new Error('Error deserializing Vault storage file');
  }

  const isEncrypted = deserialized.keystore.isEncrypted;
  if (isEncrypted && !process.env.TDEX_PASSWORD)
    throw new Error(
      `Missing TDEX_PASSWORD env variable\nThe keystore at ${vaultPath} is encrypted\n`
    );

  const keystoreValue = deserialized.keystore.value;
  return new Vault(vaultPath, keystoreValue, isEncrypted);
}
