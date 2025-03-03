import { Network } from 'bitcoinjs-lib';

import { RawVault } from '../../models/ethereum-models.js';
import { isNonEmptyString } from '../../utilities/index.js';
import {
  getVaultOutputValueFromTransaction,
  getVaultPayment,
} from '../bitcoin/bitcoin-functions.js';
import {
  checkBitcoinTransactionConfirmations,
  fetchBitcoinTransaction,
} from '../bitcoin/bitcoin-request-functions.js';

/**
 * Verifies the deposit of a vault by checking the transaction ID and confirming the transaction,
 * then returns the value of the vault's output in the transaction in satoshis.
 *
 * @param vault - The vault object containing transaction IDs and other relevant data.
 * @param extendedAttestorGroupPublicKey - The extended public key of the attestor group.
 * @param bitcoinBlockchainBlockHeight - The current block height of the Bitcoin blockchain.
 * @param bitcoinBlockchainAPI - The API endpoint to fetch Bitcoin transactions.
 * @param bitcoinNetwork - The Bitcoin network configuration (mainnet or testnet).
 * @returns A promise that resolves to the value of the vault's output in the transaction in satoshis, or 0 if the transaction is not confirmed or invalid.
 * @throws Will log an error message if there is an issue verifying the vault deposit.
 */
export async function getVaultDepositValue(
  vault: RawVault,
  extendedAttestorGroupPublicKey: string,
  bitcoinBlockchainBlockHeight: number,
  bitcoinBlockchainAPI: string,
  bitcoinNetwork: Network
): Promise<number> {
  try {
    const hasWithdrawDepositTransactionID = isNonEmptyString(vault.wdTxId);
    const hasFundingTransactionID = isNonEmptyString(vault.fundingTxId);

    if (!hasWithdrawDepositTransactionID && !hasFundingTransactionID) {
      return 0;
    }

    const fundingTransaction = await fetchBitcoinTransaction(
      hasWithdrawDepositTransactionID ? vault.wdTxId : vault.fundingTxId,
      bitcoinBlockchainAPI
    );

    const isFundingTransactionConfirmed = await checkBitcoinTransactionConfirmations(
      fundingTransaction,
      bitcoinBlockchainBlockHeight
    );

    return isFundingTransactionConfirmed
      ? getVaultOutputValueFromTransaction(
          getVaultPayment(
            vault.uuid,
            vault.taprootPubKey,
            extendedAttestorGroupPublicKey,
            bitcoinNetwork
          ),
          fundingTransaction
        )
      : 0;
  } catch (error) {
    console.log(`Error verifying Vault Deposit: ${error}`);
    return 0;
  }
}
