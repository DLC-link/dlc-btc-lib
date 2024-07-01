import { bytesToHex } from '@noble/hashes/utils';
import { p2wpkh } from '@scure/btc-signer';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import { createTaprootMultisigPayment, deriveUnhardenedKeyPairFromRootPrivateKey, deriveUnhardenedPublicKey, finalizeUserInputs, getBalance, getFeeRate, getUnspendableKeyCommittedToUUID, } from '../functions/bitcoin/bitcoin-functions.js';
import { createDepositTransaction, createFundingTransaction, createWithdrawalTransaction, } from '../functions/bitcoin/psbt-functions.js';
export class PrivateKeyDLCHandler {
    derivedKeyPair;
    payment;
    bitcoinNetwork;
    bitcoinBlockchainAPI;
    bitcoinBlockchainFeeRecommendationAPI;
    constructor(bitcoinWalletPrivateKey, walletAccountIndex, bitcoinNetwork, bitcoinBlockchainAPI, bitcoinBlockchainFeeRecommendationAPI) {
        switch (bitcoinNetwork) {
            case bitcoin:
                this.bitcoinBlockchainAPI = 'https://mempool.space/api';
                this.bitcoinBlockchainFeeRecommendationAPI =
                    'https://mempool.space/api/v1/fees/recommended';
                break;
            case testnet:
                this.bitcoinBlockchainAPI = 'https://mempool.space/testnet/api';
                this.bitcoinBlockchainFeeRecommendationAPI =
                    'https://mempool.space/testnet/api/v1/fees/recommended';
                break;
            case regtest:
                if (bitcoinBlockchainAPI === undefined ||
                    bitcoinBlockchainFeeRecommendationAPI === undefined) {
                    throw new Error('Regtest requires a Bitcoin Blockchain API and a Bitcoin Blockchain Fee Recommendation API');
                }
                this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
                this.bitcoinBlockchainFeeRecommendationAPI = bitcoinBlockchainFeeRecommendationAPI;
                break;
            default:
                throw new Error('Invalid Bitcoin Network');
        }
        this.bitcoinNetwork = bitcoinNetwork;
        const nativeSegwitDerivedKeyPair = deriveUnhardenedKeyPairFromRootPrivateKey(bitcoinWalletPrivateKey, bitcoinNetwork, 'p2wpkh', walletAccountIndex);
        const taprootDerivedKeyPair = deriveUnhardenedKeyPairFromRootPrivateKey(bitcoinWalletPrivateKey, bitcoinNetwork, 'p2tr', walletAccountIndex);
        this.derivedKeyPair = {
            taprootDerivedKeyPair,
            nativeSegwitDerivedKeyPair,
        };
    }
    setPayment(nativeSegwitPayment, taprootMultisigPayment) {
        this.payment = {
            nativeSegwitPayment,
            taprootMultisigPayment,
        };
    }
    getPayment() {
        if (!this.payment) {
            throw new Error('Payment Information not set');
        }
        return this.payment;
    }
    getTaprootDerivedPublicKey() {
        return bytesToHex(this.derivedKeyPair.taprootDerivedKeyPair.publicKey);
    }
    getVaultRelatedAddress(paymentType) {
        const payment = this.payment;
        if (payment === undefined) {
            throw new Error('Payment objects have not been set');
        }
        let address;
        switch (paymentType) {
            case 'p2wpkh':
                if (!payment.nativeSegwitPayment.address) {
                    throw new Error('Native Segwit Payment Address is undefined');
                }
                address = payment.nativeSegwitPayment.address;
                return address;
            case 'p2tr':
                if (!payment.taprootMultisigPayment.address) {
                    throw new Error('Taproot Multisig Payment Address is undefined');
                }
                address = payment.taprootMultisigPayment.address;
                return address;
            default:
                throw new Error('Invalid Payment Type');
        }
    }
    getPrivateKey(paymentType) {
        const privateKey = paymentType === 'p2wpkh'
            ? this.derivedKeyPair.nativeSegwitDerivedKeyPair.privateKey
            : this.derivedKeyPair.taprootDerivedKeyPair.privateKey;
        if (!privateKey) {
            throw new Error('Private Key is Undefined');
        }
        return privateKey;
    }
    createPayments(vaultUUID, attestorGroupPublicKey) {
        try {
            const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
            const unspendableDerivedPublicKey = deriveUnhardenedPublicKey(unspendablePublicKey, this.bitcoinNetwork);
            const attestorDerivedPublicKey = deriveUnhardenedPublicKey(attestorGroupPublicKey, this.bitcoinNetwork);
            const nativeSegwitPayment = p2wpkh(this.derivedKeyPair.nativeSegwitDerivedKeyPair.publicKey, this.bitcoinNetwork);
            const taprootMultisigPayment = createTaprootMultisigPayment(unspendableDerivedPublicKey, attestorDerivedPublicKey, this.derivedKeyPair.taprootDerivedKeyPair.publicKey, this.bitcoinNetwork);
            this.setPayment(nativeSegwitPayment, taprootMultisigPayment);
            return {
                nativeSegwitPayment,
                taprootMultisigPayment,
            };
        }
        catch (error) {
            throw new Error(`Error creating required Payment objects: ${error}`);
        }
    }
    async createFundingPSBT(vault, bitcoinAmount, attestorGroupPublicKey, feeRateMultiplier, customFeeRate) {
        const { nativeSegwitPayment, taprootMultisigPayment } = this.createPayments(vault.uuid, attestorGroupPublicKey);
        if (nativeSegwitPayment.address === undefined || taprootMultisigPayment.address === undefined) {
            throw new Error('Could not get Addresses from Payments');
        }
        const addressBalance = await getBalance(nativeSegwitPayment.address, this.bitcoinBlockchainAPI);
        if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
            throw new Error('Insufficient Funds');
        }
        const feeRate = customFeeRate ??
            BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));
        const fundingTransaction = await createFundingTransaction(bitcoinAmount, this.bitcoinNetwork, taprootMultisigPayment.address, nativeSegwitPayment, feeRate, vault.btcFeeRecipient, vault.btcMintFeeBasisPoints.toBigInt(), this.bitcoinBlockchainAPI);
        return fundingTransaction;
    }
    async createWithdrawalPSBT(vault, withdrawAmount, attestorGroupPublicKey, fundingTransactionID, feeRateMultiplier, customFeeRate) {
        try {
            const { nativeSegwitPayment, taprootMultisigPayment } = this.createPayments(vault.uuid, attestorGroupPublicKey);
            if (taprootMultisigPayment.address === undefined ||
                nativeSegwitPayment.address === undefined) {
                throw new Error('Payment Address is undefined');
            }
            const feeRate = customFeeRate ??
                BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));
            const withdrawalTransaction = await createWithdrawalTransaction(this.bitcoinBlockchainAPI, withdrawAmount, this.bitcoinNetwork, fundingTransactionID, taprootMultisigPayment, nativeSegwitPayment.address, feeRate, vault.btcFeeRecipient, vault.btcRedeemFeeBasisPoints.toBigInt());
            return withdrawalTransaction;
        }
        catch (error) {
            throw new Error(`Error creating Withdrawal PSBT: ${error}`);
        }
    }
    signPSBT(psbt, transactionType) {
        switch (transactionType) {
            case 'funding':
                psbt.sign(this.getPrivateKey('p2wpkh'));
                psbt.finalize();
                break;
            case 'deposit':
                try {
                    psbt.sign(this.getPrivateKey('p2tr'));
                }
                catch (error) {
                    // this can happen if there are no tr inputs to sign
                }
                try {
                    psbt.sign(this.getPrivateKey('p2wpkh'));
                }
                catch (error) {
                    // this can happen if there are no p2wpkh inputs to sign
                }
                finalizeUserInputs(psbt, this.getPayment().nativeSegwitPayment);
                break;
            case 'withdraw':
                psbt.sign(this.getPrivateKey('p2tr'));
                break;
            default:
                throw new Error('Invalid Transaction Type');
        }
        return psbt;
    }
    async createDepositPSBT(depositAmount, vault, attestorGroupPublicKey, fundingTransactionID, feeRateMultiplier, customFeeRate) {
        const { nativeSegwitPayment, taprootMultisigPayment } = this.createPayments(vault.uuid, attestorGroupPublicKey);
        if (taprootMultisigPayment.address === undefined || nativeSegwitPayment.address === undefined) {
            throw new Error('Payment Address is undefined');
        }
        const feeRate = customFeeRate ??
            BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));
        const depositTransaction = await createDepositTransaction(this.bitcoinBlockchainAPI, this.bitcoinNetwork, depositAmount, fundingTransactionID, taprootMultisigPayment, nativeSegwitPayment, feeRate, vault.btcFeeRecipient, vault.btcMintFeeBasisPoints.toBigInt());
        return depositTransaction;
    }
}
