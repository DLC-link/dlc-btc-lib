import { Network } from 'bitcoinjs-lib';

import { RawVault } from '../../models/ethereum-models.js';
import { isNonEmptyString } from '../../utilities/index.js';
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
import { BitcoinCoreRpcConnection } from '../bitcoin/bitcoincore-rpc-connection.js';

export async function verifyVaultDeposit(
  vault: RawVault,
  attestorGroupPublicKey: Buffer,
  bitcoinConnection: BitcoinCoreRpcConnection,
  bitcoinNetwork: Network
): Promise<number> {
  try {
    if (!isNonEmptyString(vault.wdTxId) && !isNonEmptyString(vault.fundingTxId)) return 0;

    const txID = isNonEmptyString(vault.wdTxId) ? vault.wdTxId : vault.fundingTxId;

    const fundingTransaction = await fetchBitcoinTransaction(txID, bitcoinConnection);

    const isFundingTransactionConfirmed =
      await checkBitcoinTransactionConfirmations(fundingTransaction);

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
    return vaultTransactionOutput.reduce((a, b) => a + b.value, 0);
  } catch (error) {
    console.log(`Error verifying Vault Deposit: ${error}`);
    return 0;
  }
}
