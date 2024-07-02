import { hex } from '@scure/base';
import { Network } from 'bitcoinjs-lib';

import {
  createTaprootMultisigPayment,
  deriveUnhardenedPublicKey,
  getUnspendableKeyCommittedToUUID,
  getValueMatchingOutputFromTransaction,
  validateScript,
} from '../functions/bitcoin/bitcoin-functions.js';
import {
  checkBitcoinTransactionConfirmations,
  fetchBitcoinBlockchainBlockHeight,
  fetchBitcoinTransaction,
} from '../functions/bitcoin/bitcoin-request-functions.js';
import { RawVault } from '../models/ethereum-models.js';

export class ProofOfReserveHandler {
  private bitcoinBlockchainAPI: string;
  private bitcoinNetwork: Network;
  private attestorGroupPublicKey: string;

  constructor(
    bitcoinBlockchainAPI: string,
    bitcoinNetwork: Network,
    attestorGroupPublicKey: string
  ) {
    this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
    this.bitcoinNetwork = bitcoinNetwork;
    this.attestorGroupPublicKey = attestorGroupPublicKey;
  }

  async verifyVaultDeposit(
    vault: RawVault,
    attestorGroupPublicKey: Buffer,
    bitcoinBlockchainBlockHeight: number
  ): Promise<boolean> {
    try {
      const fundingTransaction = await fetchBitcoinTransaction(
        vault.fundingTxId,
        this.bitcoinBlockchainAPI
      );
      const isFundingTransactionConfirmed = await checkBitcoinTransactionConfirmations(
        fundingTransaction,
        bitcoinBlockchainBlockHeight
      );

      if (!isFundingTransactionConfirmed) {
        return false;
      }

      const vaultTransactionOutput = getValueMatchingOutputFromTransaction(
        fundingTransaction,
        vault.valueLocked.toNumber()
      );

      const unspendableKeyCommittedToUUID = deriveUnhardenedPublicKey(
        getUnspendableKeyCommittedToUUID(vault.uuid, this.bitcoinNetwork),
        this.bitcoinNetwork
      );
      const taprootMultisigPayment = createTaprootMultisigPayment(
        unspendableKeyCommittedToUUID,
        attestorGroupPublicKey,
        Buffer.from(vault.taprootPubKey, 'hex'),
        this.bitcoinNetwork
      );

      return validateScript(
        taprootMultisigPayment.script,
        hex.decode(vaultTransactionOutput.scriptpubkey)
      );
    } catch (error) {
      console.error(`Error verifying Vault Deposit: ${error}`);
      return false;
    }
  }

  async calculateProofOfReserve(vaults: RawVault[]): Promise<number> {
    const bitcoinBlockchainBlockHeight = await fetchBitcoinBlockchainBlockHeight(
      this.bitcoinBlockchainAPI
    );

    const derivedAttestorGroupPublicKey = deriveUnhardenedPublicKey(
      this.attestorGroupPublicKey,
      this.bitcoinNetwork
    );
    const verifiedDeposits = await Promise.all(
      vaults.map(async vault => {
        return (await this.verifyVaultDeposit(
          vault,
          derivedAttestorGroupPublicKey,
          bitcoinBlockchainBlockHeight
        )) === true
          ? vault.valueLocked.toNumber()
          : 0;
      })
    );
    return verifiedDeposits.reduce((a, b) => a + b, 0);
  }
}
