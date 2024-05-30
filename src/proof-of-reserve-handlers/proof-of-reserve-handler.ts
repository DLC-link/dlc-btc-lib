import {
  createTaprootMultisigPayment,
  createTaprootMultisigPaymentLegacy,
  deriveUnhardenedPublicKey,
  findMatchingScript,
  getUnspendableKeyCommittedToUUID,
  getValueMatchingInputFromTransaction,
} from '@bitcoin/bitcoin-functions.js';
import {
  checkBitcoinTransactionConfirmations,
  fetchBitcoinBlockchainBlockHeight,
  fetchBitcoinTransaction,
} from '@bitcoin/bitcoin-request-functions.js';
import { RawVault } from '@models/ethereum-models.js';
import { hex } from '@scure/base';
import { Network } from 'bitcoinjs-lib';

export class ProofOfReserveHandler {
  private bitcoinBlockchainAPI: string;
  private bitcoinNetwork: Network;
  private attestorGroupPublicKeyV1: string;
  private attestorGroupPublicKeyV2: string;

  constructor(
    bitcoinBlockchainAPI: string,
    bitcoinNetwork: Network,
    attestorGroupPublicKeyV1: string,
    attestorGroupPublicKeyV2: string
  ) {
    this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
    this.bitcoinNetwork = bitcoinNetwork;
    this.attestorGroupPublicKeyV1 = attestorGroupPublicKeyV1;
    this.attestorGroupPublicKeyV2 = attestorGroupPublicKeyV2;
  }

  async verifyVaultDeposit(
    vault: RawVault,
    attestorGroupPublicKeyV1: string,
    attestorGroupPublicKeyV2: Buffer,
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

      const closingTransactionInput = getValueMatchingInputFromTransaction(
        fundingTransaction,
        vault.valueLocked.toNumber()
      );

      const taprootMultisigPaymentLegacyA = createTaprootMultisigPaymentLegacy(
        vault.taprootPubKey,
        attestorGroupPublicKeyV1,
        vault.uuid,
        this.bitcoinNetwork
      );
      const taprootMultisigPaymentLegacyB = createTaprootMultisigPaymentLegacy(
        attestorGroupPublicKeyV1,
        vault.taprootPubKey,
        vault.uuid,
        this.bitcoinNetwork
      );

      const unspendableKeyCommittedToUUID = deriveUnhardenedPublicKey(
        getUnspendableKeyCommittedToUUID(vault.uuid, this.bitcoinNetwork),
        this.bitcoinNetwork
      );
      const taprootMultisigPayment = createTaprootMultisigPayment(
        unspendableKeyCommittedToUUID,
        attestorGroupPublicKeyV2,
        Buffer.from(vault.taprootPubKey, 'hex'),
        this.bitcoinNetwork
      );

      return findMatchingScript(
        [
          taprootMultisigPaymentLegacyA.script,
          taprootMultisigPaymentLegacyB.script,
          taprootMultisigPayment.script,
        ],
        hex.decode(closingTransactionInput.scriptpubkey)
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
      this.attestorGroupPublicKeyV2,
      this.bitcoinNetwork
    );
    const verifiedDeposits = await Promise.all(
      vaults.map(async vault => {
        return (await this.verifyVaultDeposit(
          vault,
          this.attestorGroupPublicKeyV1,
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
