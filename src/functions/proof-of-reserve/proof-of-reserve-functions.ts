import { Network } from 'bitcoinjs-lib';

import { RawVault } from '../../models/ethereum-models.js';
import { isStringDefinedAndNotEmpty } from '../../utilities/index.js';
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
): Promise<number> {
  try {
    if (!isStringDefinedAndNotEmpty(vault.wdTxId) && !isStringDefinedAndNotEmpty(vault.fundingTxId))
      return 0;

    const txID = isStringDefinedAndNotEmpty(vault.wdTxId) ? vault.wdTxId : vault.fundingTxId;

    const fundingTransaction = await fetchBitcoinTransaction(txID, bitcoinBlockchainAPI);

    const isFundingTransactionConfirmed = await checkBitcoinTransactionConfirmations(
      fundingTransaction,
      bitcoinBlockchainBlockHeight
    );

    if (!isFundingTransactionConfirmed) {
      return 0;
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
      return 0;
    }

    return vaultTransactionOutput.value;
  } catch (error) {
    console.log(`Error verifying Vault Deposit: ${error}`);
    return 0;
  }
}
