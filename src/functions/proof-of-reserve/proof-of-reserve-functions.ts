import { Network } from 'bitcoinjs-lib';

import { RawVault } from '../../models/ethereum-models.js';
import { isNonEmptyString } from '../../utilities/index.js';
import {
  getScriptMatchingOutputFromTransaction,
  getVaultPayment,
} from '../bitcoin/bitcoin-functions.js';
import {
  checkBitcoinTransactionConfirmations,
  fetchBitcoinTransaction,
} from '../bitcoin/bitcoin-request-functions.js';

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
export async function getVaultDepositAmount(
  vault: RawVault,
  extendedAttestorGroupPublicKey: string,
  bitcoinBlockchainBlockHeight: number,
  bitcoinBlockchainAPI: string,
  bitcoinNetwork: Network
): Promise<number> {
  try {
    const { uuid, taprootPubKey, wdTxId, fundingTxId } = vault;

    const hasWithdrawDepositTransaction = isNonEmptyString(wdTxId);
    const hasFundingTransaction = isNonEmptyString(fundingTxId);

    if (!hasWithdrawDepositTransaction && !hasFundingTransaction) return 0;

    const txID = hasWithdrawDepositTransaction ? wdTxId : fundingTxId;

    const fundingTransaction = await fetchBitcoinTransaction(txID, bitcoinBlockchainAPI);

    const vaultPayment = getVaultPayment(
      uuid,
      taprootPubKey,
      extendedAttestorGroupPublicKey,
      bitcoinNetwork
    );

    const isFundingTransactionConfirmed = await checkBitcoinTransactionConfirmations(
      fundingTransaction,
      bitcoinBlockchainBlockHeight
    );

    if (!isFundingTransactionConfirmed) {
      const vaultMultisigInput = fundingTransaction.vin.find(
        input => input.prevout.scriptpubkey_address === vaultPayment.address
      );

      return vaultMultisigInput ? vaultMultisigInput.prevout.value : 0;
    }

    const vaultTransactionOutput = getScriptMatchingOutputFromTransaction(
      fundingTransaction,
      vaultPayment.script
    );

    if (!vaultTransactionOutput) {
      return 0;
    }

    return vaultTransactionOutput.value;
  } catch (error) {
    console.log(`Error verifying Vault Deposit: ${error}`);
    return 0;
  }
}
