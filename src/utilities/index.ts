import { Decimal } from 'decimal.js';
import { isNil, isNotEmpty, isNotNil } from 'ramda';

import {
  AttestorChainID,
  EVMAttestorChainID,
  XRPLAttestorChainID,
} from '../models/attestor.models.js';

export function shiftValue(value: number): number {
  const decimalPoweredShift = new Decimal(10 ** 8);
  const decimalValue = new Decimal(Number(value));
  const decimalShiftedValue = decimalValue.mul(decimalPoweredShift).toNumber();

  return decimalShiftedValue;
}

export function unshiftValue(value: number): number {
  const decimalPoweredShift = new Decimal(10 ** 8);
  const decimalValue = new Decimal(Number(value));
  const decimalShiftedValue = decimalValue.div(decimalPoweredShift).toNumber();

  return decimalShiftedValue;
}

export function customShiftValue(value: number, shift: number, unshift: boolean): number {
  const decimalPoweredShift = new Decimal(10 ** shift);
  const decimalValue = new Decimal(Number(value));
  const decimalShiftedValue = unshift
    ? decimalValue.div(decimalPoweredShift).toNumber()
    : decimalValue.mul(decimalPoweredShift).toNumber();

  return decimalShiftedValue;
}

export function truncateAddress(address: string): string {
  const truncationLength = 4;
  const prefix = address.substring(0, truncationLength);
  const suffix = address.substring(address.length - truncationLength);
  return `${prefix}...${suffix}`;
}

export function createRangeFromLength(length: number) {
  return [...Array(length).keys()];
}

export function isUndefined(value: unknown): value is undefined | null {
  return isNil(value);
}

export function isDefined<T>(argument: T | undefined): argument is T {
  return isNotNil(argument);
}

export function isNonEmptyString(string: string | undefined): boolean {
  return isNotNil(string) && isNotEmpty(string);
}

export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function reverseBytes(bytes: Buffer): Buffer;
export function reverseBytes(bytes: Uint8Array): Uint8Array;
export function reverseBytes(bytes: Buffer | Uint8Array) {
  if (Buffer.isBuffer(bytes)) return Buffer.from(bytes).reverse();
  return new Uint8Array(bytes.slice().reverse());
}

export function isSupportedChainID(chainID: string): chainID is AttestorChainID {
  return (
    Object.values(EVMAttestorChainID).includes(chainID as EVMAttestorChainID) ||
    Object.values(XRPLAttestorChainID).includes(chainID as XRPLAttestorChainID)
  );
}

export function isEVMChainID(chainID: string): chainID is EVMAttestorChainID {
  return Object.values(EVMAttestorChainID).includes(chainID as EVMAttestorChainID);
}

export function isXRPLChainID(chainID: string): chainID is XRPLAttestorChainID {
  return Object.values(XRPLAttestorChainID).includes(chainID as XRPLAttestorChainID);
}
