import { confidential } from 'liquidjs-lib';

export * from './crypto';
export * from './types';
export * from './coinselect';
export * from './explorer';

export function toAssetHash(x: Buffer): string {
  const withoutFirstByte = x.slice(1);
  return withoutFirstByte.reverse().toString('hex');
}

export function toNumber(x: Buffer): number {
  return confidential.confidentialValueToSatoshi(x);
}

export function toSatoshi(x: number): number {
  return Math.floor(x * Math.pow(10, 8));
}

export function makeid(length: number): string {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function objectFlip(obj: { [x: string]: string | number }) {
  const ret = {};
  Object.keys(obj).forEach((key: string) => {
    (ret as any)[obj[key]] = key;
  });
  return ret;
}
