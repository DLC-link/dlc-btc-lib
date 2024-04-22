import { Decimal } from 'decimal.js';

export function satsToBitcoin(value: number): number {
  const decimalPoweredShift = new Decimal(10 ** 8);
  const decimalValue = new Decimal(Number(value));
  const decimalShiftedValue = decimalValue.mul(decimalPoweredShift).toNumber();

  return decimalShiftedValue;
}
