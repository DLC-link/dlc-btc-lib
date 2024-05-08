/** @format */

import { Decimal } from 'decimal.js';

export function bitcoinToSats(value: number): number {
  const decimalPoweredShift = new Decimal(10 ** 8);
  const decimalValue = new Decimal(Number(value));
  const decimalShiftedValue = decimalValue.mul(decimalPoweredShift).toNumber();

  return decimalShiftedValue;
}

export function createRangeFromLength(length: number) {
  return [...Array(length).keys()];
}

export function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}

export function isDefined<T>(argument: T | undefined): argument is T {
  return !isUndefined(argument);
}

export function reverseBytes(bytes: Buffer): Buffer;
export function reverseBytes(bytes: Uint8Array): Uint8Array;
export function reverseBytes(bytes: Buffer | Uint8Array) {
  if (Buffer.isBuffer(bytes)) return Buffer.from(bytes).reverse();
  return new Uint8Array(bytes.slice().reverse());
}
