import { Network } from 'bitcoinjs-lib';
import { RawVault } from 'src/models/ethereum-models.js';

import {
  createTaprootMultisigPayment,
  deriveUnhardenedPublicKey,
  getScriptMatchingOutputFromTransaction,
  getUnspendableKeyCommittedToUUID,
} from '../bitcoin/bitcoin-functions.js';
import {
  checkBitcoinTransactionConfirmations,
  fetchBitcoinTransaction,
} from '../bitcoin/bitcoin-request-functions.js';

export async function verifyVaultDeposit(
  vault: RawVault,
  attestorGroupPublicKey: Buffer,
  bitcoinBlockchainBlockHeight: number,
  bitcoinBlockchainAPI: string,
  bitcoinNetwork: Network
): Promise<boolean> {
  try {
    const fundingTransaction = await fetchBitcoinTransaction(
      vault.fundingTxId,
      bitcoinBlockchainAPI
    );

    const isFundingTransactionConfirmed = await checkBitcoinTransactionConfirmations(
      fundingTransaction,
      bitcoinBlockchainBlockHeight
    );

    if (!isFundingTransactionConfirmed) {
      return false;
    }

    const unspendableKeyCommittedToUUID = deriveUnhardenedPublicKey(
      getUnspendableKeyCommittedToUUID(vault.uuid, bitcoinNetwork),
      bitcoinNetwork
    );

    const taprootMultisigPayment = createTaprootMultisigPayment(
      unspendableKeyCommittedToUUID,
      attestorGroupPublicKey,
      Buffer.from(vault.taprootPubKey, 'hex'),
      bitcoinNetwork
    );

    const vaultTransactionOutput = getScriptMatchingOutputFromTransaction(
      fundingTransaction,
      taprootMultisigPayment.script
    );

    if (!vaultTransactionOutput) {
      return false;
    }

    if (vaultTransactionOutput.value !== vault.valueLocked.toNumber()) {
      return false;
    }

    return true;
  } catch (error) {
    console.log(`Error verifying Vault Deposit: ${error}`);
    return false;
  }
}
