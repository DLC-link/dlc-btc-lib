import { Decimal } from 'decimal.js';
import { equals, isNil } from 'ramda';

import { RawVault, VaultState } from '../../models/ethereum-models.js';
import { VaultEvent, VaultEventPayload } from '../../models/vault-event.models.js';

/**
 * Filters an array of vaults to return only those that have changed compared to their previous state.
 * A vault is considered "changed" if its status, uuid, valueLocked, or valueMinted properties differ
 * from any matching vault in the previous state.
 *
 * @param {RawVault[]} currentVaults - The current array of vault objects to check for changes
 * @param {RawVault[]} previousVaults - The array of vault objects from the previous state to compare against
 * @returns {RawVault[]} An array of vault objects that have changed since their previous state
 */
// prettier-ignore
export const getUpdatedVaults = (
  currentVaults: RawVault[],
  previousVaults: RawVault[]
): RawVault[] =>
  currentVaults.filter(currentVault =>
    !previousVaults.find(previousVault =>
      (['uuid', 'status', 'valueLocked', 'valueMinted'] as const).every(
        k => currentVault[k] === previousVault[k]
      )
    )
  );

/**
 * Creates a vault event payload with standardized structure.
 *
 * @param {VaultEvent} eventName - The type of vault event being created
 * @param {string} vaultUUID - The unique identifier of the vault
 * @param {number} value - The numerical value associated with the event
 * @returns {VaultEventPayload} A formatted vault event payload object
 */
export const createVaultEvent = (
  name: VaultEvent,
  uuid: string,
  value?: number
): VaultEventPayload => ({
  name,
  uuid,
  value,
});

/**
 * Determines and creates the appropriate vault event based on changes between previous and current vault states.
 *
 * @param {RawVault | undefined} previousVault - The previous state of the vault, undefined if this is a new vault
 * @param {RawVault} vault - The current state of the vault
 * @returns {VaultEventPayload} The appropriate vault event payload based on the state change:
 *   - Returns SETUP_COMPLETE event if this is a new vault (no previous state)
 *   - For status changes:
 *     - When changing to FUNDED: Returns WITHDRAW_COMPLETE if previous minted value was less than previous locked value,
 *       otherwise returns MINT_COMPLETE
 *     - When changing to PENDING: Returns WITHDRAW_PENDING if locked value differs from minted value,
 *       otherwise returns MINT_PENDING
 *   - Returns BURN_COMPLETE event if only the minted value has changed
 * @throws {Error} Throws 'Invalid Vault State Change' if the state change doesn't match any expected patterns
 */
export const getVaultEvent = (
  previousVault: RawVault | undefined,
  vault: RawVault
): VaultEventPayload => {
  if (isNil(previousVault))
    return createVaultEvent(VaultEvent.SETUP_COMPLETE, vault.uuid, vault.valueLocked.toNumber());

  if (!equals(previousVault.status, vault.status))
    return {
      [VaultState.FUNDED]:
        previousVault.valueMinted.toNumber() < previousVault.valueLocked.toNumber()
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
        : // TODO: Replace hardcoded 0 with actual pending mint value
          // Requires:
          // 1. Creating vaultMultisig object
          // 2. Fetching transaction data
          // 3. Using getValueOutput() to calculate the real value
          createVaultEvent(VaultEvent.MINT_PENDING, vault.uuid),
    }[vault.status as VaultState.FUNDED | VaultState.PENDING];

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

/**
 * Generates an array of vault events by comparing current and previous vault states.
 * Only processes vaults that have had meaningful changes in their state.
 *
 * @param {RawVault[]} vaults - Array of current vault states
 * @param {RawVault[]} previousVaults - Array of previous vault states to compare against
 * @returns {VaultEventPayload[]} Array of vault events representing all state changes that occurred
 *
 * @see getUpdatedVaults - Used to filter vaults that have changed
 * @see getVaultEvent - Used to determine the specific event for each vault change
 */
export const getVaultEvents = (
  vaults: RawVault[],
  previousVaults: RawVault[]
): VaultEventPayload[] =>
  getUpdatedVaults(vaults, previousVaults).map(vault =>
    getVaultEvent(
      previousVaults.find(prev => prev.uuid === vault.uuid),
      vault
    )
  );
