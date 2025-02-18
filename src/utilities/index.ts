import { Decimal } from 'decimal.js';
import { any, complement, equals, filter, find, isNil, lt, map, pick, pipe } from 'ramda';

import { RawVault, VaultState } from '../models/ethereum-models.js';

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

export function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}

export function isDefined<T>(argument: T | undefined): argument is T {
  return !isUndefined(argument);
}

export function isNonEmptyString(string: string | undefined): boolean {
  return isDefined(string) && string !== '';
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

export const getUpdatedVaults = (vaults: RawVault[], previousVaults: RawVault[]): RawVault[] =>
  filter(
    complement(vault =>
      any(
        previousVault =>
          equals(
            pick(['uuid', 'status', 'valueLocked', 'valueMinted'], vault),
            pick(['uuid', 'status', 'valueLocked', 'valueMinted'], previousVault)
          ),
        previousVaults
      )
    ),
    vaults
  );

interface VaultEventPayload {
  name: VaultEvent;
  uuid: string;
  value: number;
}

const createVaultEvent = (
  eventName: VaultEvent,
  vaultUUID: string,
  value: number
): VaultEventPayload => ({
  name: eventName,
  uuid: vaultUUID,
  value: value,
});

export enum VaultEvent {
  SETUP_COMPLETE = 'vaultSetup',
  WITHDRAW_PENDING = 'withdrawPending',
  MINT_PENDING = 'mintPending',
  MINT_COMPLETE = 'mintComplete',
  BURN_COMPLETE = 'burnComplete',
  WITHDRAW_COMPLETE = 'withdrawComplete',
}

export const getVaultStateChange = (
  previousVault: RawVault | undefined,
  vault: RawVault
): VaultEventPayload => {
  if (isNil(previousVault))
    return createVaultEvent(VaultEvent.SETUP_COMPLETE, vault.uuid, vault.valueLocked.toNumber());

  type SupportedVaultState = Exclude<
    VaultState,
    VaultState.CLOSED | VaultState.CLOSING | VaultState.READY
  >;

  if (!equals(previousVault.status, vault.status))
    return {
      [VaultState.FUNDED]: lt(
        previousVault.valueMinted.toNumber(),
        previousVault.valueLocked.toNumber()
      )
        ? createVaultEvent(
            VaultEvent.WITHDRAW_COMPLETE,
            vault.uuid,
            new Decimal(previousVault.valueLocked.toNumber())
              .minus(vault.valueLocked.toNumber())
              .toNumber()
          )
        : createVaultEvent(VaultEvent.MINT_COMPLETE, vault.uuid, vault.valueMinted.toNumber()),
      [VaultState.PENDING]: !equals(vault.valueLocked, vault.valueMinted)
        ? createVaultEvent(
            VaultEvent.WITHDRAW_PENDING,
            vault.uuid,
            new Decimal(previousVault.valueLocked.toNumber())
              .minus(vault.valueMinted.toNumber())
              .toNumber()
          )
        : createVaultEvent(VaultEvent.MINT_PENDING, vault.uuid, 0), // TODO: This can be an actual value, by utilizing the getValueOutput function, but that requires to create the vaultMultisig object and to fetch the transaction data
    }[vault.status as SupportedVaultState];

  if (!equals(previousVault.valueMinted, vault.valueMinted))
    return createVaultEvent(
      VaultEvent.BURN_COMPLETE,
      vault.uuid,
      new Decimal(previousVault.valueMinted.toNumber())
        .minus(vault.valueMinted.toNumber())
        .toNumber()
    );

  throw new Error('Invalid Vault State Change');
};

export const getVaultEvents = (
  vaults: RawVault[],
  previousVaults: RawVault[]
): VaultEventPayload[] =>
  pipe(
    (vaults: RawVault[]) => getUpdatedVaults(vaults, previousVaults),
    map((vault: RawVault) => {
      return getVaultStateChange(
        find((prev: RawVault) => equals(prev.uuid, vault.uuid), previousVaults),
        vault
      );
    })
  )(vaults);
