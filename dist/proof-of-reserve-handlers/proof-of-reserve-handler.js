import { hex } from '@scure/base';
import { createTaprootMultisigPayment, deriveUnhardenedPublicKey, getUnspendableKeyCommittedToUUID, getValueMatchingInputFromTransaction, validateScript, } from '../functions/bitcoin/bitcoin-functions.js';
import { checkBitcoinTransactionConfirmations, fetchBitcoinBlockchainBlockHeight, fetchBitcoinTransaction, } from '../functions/bitcoin/bitcoin-request-functions.js';
export class ProofOfReserveHandler {
    bitcoinBlockchainAPI;
    bitcoinNetwork;
    attestorGroupPublicKey;
    constructor(bitcoinBlockchainAPI, bitcoinNetwork, attestorGroupPublicKey) {
        this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
        this.bitcoinNetwork = bitcoinNetwork;
        this.attestorGroupPublicKey = attestorGroupPublicKey;
    }
    async verifyVaultDeposit(vault, attestorGroupPublicKey, bitcoinBlockchainBlockHeight) {
        try {
            const fundingTransaction = await fetchBitcoinTransaction(vault.fundingTxId, this.bitcoinBlockchainAPI);
            const isFundingTransactionConfirmed = await checkBitcoinTransactionConfirmations(fundingTransaction, bitcoinBlockchainBlockHeight);
            if (!isFundingTransactionConfirmed) {
                return false;
            }
            const closingTransactionInput = getValueMatchingInputFromTransaction(fundingTransaction, vault.valueLocked.toNumber());
            const unspendableKeyCommittedToUUID = deriveUnhardenedPublicKey(getUnspendableKeyCommittedToUUID(vault.uuid, this.bitcoinNetwork), this.bitcoinNetwork);
            const taprootMultisigPayment = createTaprootMultisigPayment(unspendableKeyCommittedToUUID, attestorGroupPublicKey, Buffer.from(vault.taprootPubKey, 'hex'), this.bitcoinNetwork);
            return validateScript(taprootMultisigPayment.script, hex.decode(closingTransactionInput.scriptpubkey));
        }
        catch (error) {
            console.error(`Error verifying Vault Deposit: ${error}`);
            return false;
        }
    }
    async calculateProofOfReserve(vaults) {
        const bitcoinBlockchainBlockHeight = await fetchBitcoinBlockchainBlockHeight(this.bitcoinBlockchainAPI);
        const derivedAttestorGroupPublicKey = deriveUnhardenedPublicKey(this.attestorGroupPublicKey, this.bitcoinNetwork);
        const verifiedDeposits = await Promise.all(vaults.map(async (vault) => {
            return (await this.verifyVaultDeposit(vault, derivedAttestorGroupPublicKey, bitcoinBlockchainBlockHeight)) === true
                ? vault.valueLocked.toNumber()
                : 0;
        }));
        return verifiedDeposits.reduce((a, b) => a + b, 0);
    }
}
