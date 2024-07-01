import { Decimal } from 'decimal.js';
export function shiftValue(value) {
    const decimalPoweredShift = new Decimal(10 ** 8);
    const decimalValue = new Decimal(Number(value));
    const decimalShiftedValue = decimalValue.mul(decimalPoweredShift).toNumber();
    return decimalShiftedValue;
}
export function unshiftValue(value) {
    const decimalPoweredShift = new Decimal(10 ** 8);
    const decimalValue = new Decimal(Number(value));
    const decimalShiftedValue = decimalValue.div(decimalPoweredShift).toNumber();
    return decimalShiftedValue;
}
export function customShiftValue(value, shift, unshift) {
    const decimalPoweredShift = new Decimal(10 ** shift);
    const decimalValue = new Decimal(Number(value));
    const decimalShiftedValue = unshift
        ? decimalValue.div(decimalPoweredShift).toNumber()
        : decimalValue.mul(decimalPoweredShift).toNumber();
    return decimalShiftedValue;
}
export function truncateAddress(address) {
    const truncationLength = 4;
    const prefix = address.substring(0, truncationLength);
    const suffix = address.substring(address.length - truncationLength);
    return `${prefix}...${suffix}`;
}
export function createRangeFromLength(length) {
    return [...Array(length).keys()];
}
export function isUndefined(value) {
    return typeof value === 'undefined';
}
export function isDefined(argument) {
    return !isUndefined(argument);
}
export async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function reverseBytes(bytes) {
    if (Buffer.isBuffer(bytes))
        return Buffer.from(bytes).reverse();
    return new Uint8Array(bytes.slice().reverse());
}
