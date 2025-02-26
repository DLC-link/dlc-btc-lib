import { Network } from 'bitcoinjs-lib';
import { Decimal } from 'decimal.js';
import { equals, isNil } from 'ramda';

import { RawVault, VaultState } from '../../models/ethereum-models.js';
import { VaultEvent, VaultEventName } from '../../models/vault-event.models.js';
import {
  getVaultOutputValueFromTransaction,
  getVaultPayment,
} from '../bitcoin/bitcoin-functions.js';
import { fetchBitcoinTransaction } from '../bitcoin/bitcoin-request-functions.js';

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
        k => equals(currentVault[k],previousVault[k])
      )
    )
  );

/**
 * Determines and creates the appropriate vault event based on changes between previous and current vault states.
 *
 * @param previousVault - The previous state of the vault, undefined if this is a new vault
 * @param vault - The current state of the vault
 * @param extendedAttestorGroupPublicKey - The extended public key of the attestor group
 * @param bitcoinBlockchainAPIURL - The URL of the Bitcoin blockchain API
 * @param bitcoinNetwork - The Bitcoin network to use
 * @returns The appropriate vault event based on the state change
 * @throws {Error} If the state change doesn't match any expected patterns
 */
export const getVaultEvent = async (
  previousVault: RawVault | undefined,
  vault: RawVault,
  extendedAttestorGroupPublicKey: string,
  bitcoinBlockchainAPIURL: string,
  bitcoinNetwork: Network
): Promise<VaultEvent> => {
  if (isNil(previousVault)) {
    return new VaultEvent(VaultEventName.SETUP_COMPLETE, vault.uuid, vault.valueLocked.toNumber());
  }

  const getVaultEventForFunded = () => {
    // When previous minted value is less than previous locked value, the withdrawal is being completed
    // Otherwise, a new mint operation is being completed
    const isPreviousWithdrawalCompleting =
      previousVault.valueMinted.toNumber() < previousVault.valueLocked.toNumber();

    if (isPreviousWithdrawalCompleting) {
      return new VaultEvent(
        VaultEventName.WITHDRAW_COMPLETE,
        vault.uuid,
        new Decimal(previousVault.valueLocked.toNumber())
          .minus(vault.valueLocked.toNumber())
          .toNumber()
      );
    }

    return new VaultEvent(
      VaultEventName.MINT_COMPLETE,
      vault.uuid,
      new Decimal(vault.valueLocked.toNumber())
        .minus(previousVault.valueLocked.toNumber())
        .toNumber()
    );
  };

  const getVaultEventForPending = async () => {
    // When locked value differs from minted value, the vault is processing a withdrawal
    // Otherwise, the vault is processing a new mint operation
    const isProcessingWithdrawal = !equals(vault.valueLocked, vault.valueMinted);

    if (isProcessingWithdrawal) {
      return new VaultEvent(
        VaultEventName.WITHDRAW_PENDING,
        vault.uuid,
        new Decimal(previousVault.valueLocked.toNumber())
          .minus(vault.valueMinted.toNumber())
          .toNumber()
      );
    }

    const bitcoinTransaction = await fetchBitcoinTransaction(vault.wdTxId, bitcoinBlockchainAPIURL);
    const vaultPayment = getVaultPayment(
      vault.uuid,
      vault.taprootPubKey,
      extendedAttestorGroupPublicKey,
      bitcoinNetwork
    );
    const vaultOutputValue = getVaultOutputValueFromTransaction(vaultPayment, bitcoinTransaction);

    return new VaultEvent(
      VaultEventName.MINT_PENDING,
      vault.uuid,
      new Decimal(vaultOutputValue).minus(previousVault.valueLocked.toNumber()).toNumber()
    );
  };

  const hasStatusChanged = !equals(previousVault.status, vault.status);

  if (hasStatusChanged) {
    return equals(vault.status, VaultState.FUNDED)
      ? getVaultEventForFunded()
      : await getVaultEventForPending();
  }

  // Check for minted value changes (indicates burn completion)
  const hasValueMintedChanged = !equals(previousVault.valueMinted, vault.valueMinted);

  if (hasValueMintedChanged) {
    return new VaultEvent(
      VaultEventName.BURN_COMPLETE,
      vault.uuid,
      new Decimal(previousVault.valueMinted.toNumber())
        .minus(vault.valueMinted.toNumber())
        .toNumber()
    );
  }

  // If no recognized state change pattern is found, throw an error
  throw new Error(
    `Unable to determine vault event for this state change. Previous vault: ${JSON.stringify(previousVault)}, Current vault: ${JSON.stringify(vault)}`
  );
};

/**
 * Generates an array of vault events by comparing current and previous vault states.
 * Only processes vaults that have had meaningful changes in their state.
 *
 * @param vaults - Array of current vault states
 * @param previousVaults - Array of previous vault states to compare against
 * @param extendedAttestorGroupPublicKey - The extended public key of the attestor group
 * @param bitcoinBlockchainAPIURL - The URL of the Bitcoin blockchain API
 * @param bitcoinNetwork - The Bitcoin network to use
 * @returns Array of vault events representing all state changes that occurred
 *
 * @see getUpdatedVaults - Used to filter vaults that have changed
 * @see getVaultEvent - Used to determine the specific event for each vault change
 *
 * @important Vaults with deprecated statuses (status CLOSING = 2 or CLOSED = 3)
 * should be filtered out before passing into this function to prevent errors.
 * These statuses are not supported by the event generation logic.
 */
export const getVaultEvents = async (
  vaults: RawVault[],
  previousVaults: RawVault[],
  extendedAttestorGroupPublicKey: string,
  bitcoinBlockchainAPIURL: string,
  bitcoinNetwork: Network
): Promise<VaultEvent[]> => {
  const eventResults = await Promise.allSettled(
    getUpdatedVaults(vaults, previousVaults).map(vault =>
      getVaultEvent(
        previousVaults.find(prev => prev.uuid === vault.uuid),
        vault,
        extendedAttestorGroupPublicKey,
        bitcoinBlockchainAPIURL,
        bitcoinNetwork
      )
    )
  );

  eventResults
    .filter(result => result.status === 'rejected')
    .forEach(result => {
      const error = (result as PromiseRejectedResult).reason;
      console.error('Failed to process Vault event:', error);
    });

  return eventResults
    .filter((result): result is PromiseFulfilledResult<VaultEvent> => result.status === 'fulfilled')
    .map(result => result.value);
};
