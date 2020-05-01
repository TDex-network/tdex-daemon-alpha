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

export function fromSatoshi(x: number): number {
  return Number(
    (x / Math.pow(10, 8))
      .toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8,
      })
      .replace(',', '')
  );
}

// Swaps have an average size of 850 bytes.
// The lower bound of the fee account balance is set to
// be able to top up fees for at least 5 swaps.
export const FEE_AMOUNT_LIMIT = 4500;
