import { Network } from 'bitcoinjs-lib';
import { VaultProofOfReserveData } from 'src/models/proof-of-reserve.models.js';

import { RawVault } from '../../models/ethereum-models.js';
import { isNonEmptyString } from '../../utilities/index.js';
import {
  findVaultMultisigInput,
  getScriptMatchingOutputFromTransaction,
  getVaultPayment,
} from '../bitcoin/bitcoin-functions.js';
import {
  checkBitcoinTransactionConfirmations,
  fetchBitcoinTransaction,
} from '../bitcoin/bitcoin-request-functions.js';

/**
 * Gets the address of a vault.
 *
 * @param vault - The vault object containing transaction IDs and other relevant data
 * @param extendedAttestorGroupPublicKey - The extended public key of the attestor group
 * @param bitcoinNetwork - The Bitcoin network to use
 * @returns A promise that resolves to the address of the vault
 */
export async function getVaultAddress(
  vault: RawVault,
  extendedAttestorGroupPublicKey: string,
  bitcoinNetwork: Network
): Promise<string | undefined> {
  try {
    const { uuid, taprootPubKey, fundingTxId } = vault;

    if (!fundingTxId) return;

    return getVaultPayment(uuid, taprootPubKey, extendedAttestorGroupPublicKey, bitcoinNetwork)
      .address!;
  } catch (error) {
    console.log(`Error getting Vault Address: ${error}`);
    return;
  }
}

/**
 * Calculates the value of the vault's output in the transaction in satoshis.
 *
 * @param vault - The vault object containing transaction IDs and other relevant data
 * @param extendedAttestorGroupPublicKey - The extended public key of the attestor group
 * @param bitcoinBlockchainBlockHeight - The current block height of the Bitcoin blockchain
 * @param bitcoinBlockchainAPI - The URL of the Bitcoin blockchain API
 * @param bitcoinNetwork - The Bitcoin network to use
 * @returns A promise that resolves to the value of the vault's output in the transaction in satoshis, or 0 if the transaction is not confirmed or invalid
 * @throws Will log an error message if there is an issue verifying the vault deposit
 */
export async function getVaultProofOfReserveData(
  vault: RawVault,
  extendedAttestorGroupPublicKey: string,
  bitcoinBlockchainBlockHeight: number,
  bitcoinBlockchainAPI: string,
  bitcoinNetwork: Network
): Promise<VaultProofOfReserveData | undefined> {
  try {
    const { uuid, taprootPubKey, wdTxId, fundingTxId } = vault;

    const hasWithdrawDepositTransaction = isNonEmptyString(wdTxId);
    const hasFundingTransaction = isNonEmptyString(fundingTxId);

    if (!hasWithdrawDepositTransaction && !hasFundingTransaction) return;

    const txID = hasWithdrawDepositTransaction ? wdTxId : fundingTxId;

    const vaultTransaction = await fetchBitcoinTransaction(txID, bitcoinBlockchainAPI);

    const vaultPayment = getVaultPayment(
      uuid,
      taprootPubKey,
      extendedAttestorGroupPublicKey,
      bitcoinNetwork
    );

    const isVaultTransactionConfirmed = await checkBitcoinTransactionConfirmations(
      vaultTransaction,
      bitcoinBlockchainBlockHeight
    );

    if (!isVaultTransactionConfirmed) {
      const vaultMultisigInput = findVaultMultisigInput(vaultTransaction, vaultPayment.address!);

      return vaultMultisigInput
        ? { amount: vaultMultisigInput.prevout.value, address: vaultPayment.address! }
        : undefined;
    }

    const vaultTransactionOutput = getScriptMatchingOutputFromTransaction(
      vaultTransaction,
      vaultPayment.script
    );

    if (!vaultTransactionOutput) return;

    return { amount: vaultTransactionOutput.value, address: vaultPayment.address! };
  } catch (error) {
    console.log(`Error verifying Vault Deposit: ${error}`);
    return;
  }
}
