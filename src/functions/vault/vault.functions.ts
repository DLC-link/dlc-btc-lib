import { Decimal } from 'decimal.js';
import { equals, isNil } from 'ramda';

import { RawVault, VaultState } from '../../models/ethereum-models.js';
import { VaultEvent, VaultEventName } from '../../models/vault-event.models.js';

/**
 * Filters an array of vaults to return only those that have changed compared to their previous state.
 * A vault is considered "changed" if its status, uuid, valueLocked, or valueMinted properties differ
 * from any matching vault in the previous state.
 *
 * @param currentVaults - The current array of vault objects to check for changes
 * @param previousVaults - The array of vault objects from the previous state to compare against
 * @returns An array of vault objects that have changed since their previous state
 */
// prettier-ignore
export const getUpdatedVaults = (
  currentVaults: RawVault[],
  previousVaults: RawVault[]
): RawVault[] =>
  currentVaults.filter(currentVault =>
    !previousVaults.some(previousVault =>
      (['uuid', 'status', 'valueLocked', 'valueMinted'] as const).every(
        k => currentVault[k] === previousVault[k]
      )
    )
  );

/**
 * Determines and creates the appropriate vault event based on changes between previous and current vault states.
 *
 * @param previousVault - The previous state of the vault, undefined if this is a new vault
 * @param vault - The current state of the vault
 * @returns The appropriate vault event payload based on the state change:
 *   - Returns SETUP_COMPLETE event if this is a new vault (no previous state)
 *   - For status changes:
 *     - When changing to FUNDED: Returns WITHDRAW_COMPLETE if previous minted value was less than previous locked value,
 *       otherwise returns MINT_COMPLETE
 *     - When changing to PENDING: Returns WITHDRAW_PENDING if locked value differs from minted value,
 *       otherwise returns MINT_PENDING
 *   - Returns BURN_COMPLETE event if only the minted value has changed
 * @throws {Error} Throws 'Invalid Vault State Change' if the state change doesn't match any expected patterns
 */
export const getVaultEvent = (previousVault: RawVault | undefined, vault: RawVault): VaultEvent => {
  if (isNil(previousVault))
    return new VaultEvent(VaultEventName.SETUP_COMPLETE, vault.uuid, vault.valueLocked.toNumber());

  if (!equals(previousVault.status, vault.status))
    return {
      [VaultState.FUNDED]:
        previousVault.valueMinted.toNumber() < previousVault.valueLocked.toNumber()
          ? new VaultEvent(
              VaultEventName.WITHDRAW_COMPLETE,
              vault.uuid,
              new Decimal(previousVault.valueLocked.toNumber())
                .minus(vault.valueLocked.toNumber())
                .toNumber()
            )
          : new VaultEvent(VaultEventName.MINT_COMPLETE, vault.uuid, vault.valueMinted.toNumber()),
      [VaultState.PENDING]: !equals(vault.valueLocked, vault.valueMinted)
        ? new VaultEvent(
            VaultEventName.WITHDRAW_PENDING,
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
          new VaultEvent(VaultEventName.MINT_PENDING, vault.uuid),
    }[vault.status as VaultState.FUNDED | VaultState.PENDING];

  if (!equals(previousVault.valueMinted, vault.valueMinted))
    return new VaultEvent(
      VaultEventName.BURN_COMPLETE,
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
 * @param vaults - Array of current vault states
 * @param previousVaults - Array of previous vault states to compare against
 * @returns Array of vault events representing all state changes that occurred
 *
 * @see getUpdatedVaults - Used to filter vaults that have changed
 * @see getVaultEvent - Used to determine the specific event for each vault change
 */
export const getVaultEvents = (vaults: RawVault[], previousVaults: RawVault[]): VaultEvent[] =>
  getUpdatedVaults(vaults, previousVaults).map(vault =>
    getVaultEvent(
      previousVaults.find(prev => prev.uuid === vault.uuid),
      vault
    )
  );
