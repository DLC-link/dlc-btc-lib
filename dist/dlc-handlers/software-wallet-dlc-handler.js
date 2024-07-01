import { p2wpkh } from '@scure/btc-signer';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import { createTaprootMultisigPayment, deriveUnhardenedPublicKey, getBalance, getFeeRate, getUnspendableKeyCommittedToUUID, } from '../functions/bitcoin/bitcoin-functions.js';
import { createDepositTransaction, createFundingTransaction, createWithdrawalTransaction, } from '../functions/bitcoin/psbt-functions.js';
export class SoftwareWalletDLCHandler {
    nativeSegwitDerivedPublicKey;
    taprootDerivedPublicKey;
    payment;
    bitcoinNetwork;
    bitcoinBlockchainAPI;
    bitcoinBlockchainFeeRecommendationAPI;
    constructor(nativeSegwitDerivedPublicKey, taprootDerivedPublicKey, bitcoinNetwork, bitcoinBlockchainAPI, bitcoinBlockchainFeeRecommendationAPI) {
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
        this.nativeSegwitDerivedPublicKey = nativeSegwitDerivedPublicKey;
        this.taprootDerivedPublicKey = taprootDerivedPublicKey;
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
        return this.taprootDerivedPublicKey;
    }
    getVaultRelatedAddress(paymentType) {
        const payment = this.getPayment();
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
    async createPayments(vaultUUID, attestorGroupPublicKey) {
        try {
            const nativeSegwitPayment = p2wpkh(Buffer.from(this.nativeSegwitDerivedPublicKey, 'hex'), this.bitcoinNetwork);
            const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
            const unspendableDerivedPublicKey = deriveUnhardenedPublicKey(unspendablePublicKey, this.bitcoinNetwork);
            const attestorDerivedPublicKey = deriveUnhardenedPublicKey(attestorGroupPublicKey, this.bitcoinNetwork);
            const taprootMultisigPayment = createTaprootMultisigPayment(unspendableDerivedPublicKey, attestorDerivedPublicKey, Buffer.from(this.taprootDerivedPublicKey, 'hex'), this.bitcoinNetwork);
            this.setPayment(nativeSegwitPayment, taprootMultisigPayment);
            return {
                nativeSegwitPayment,
                taprootMultisigPayment,
            };
        }
        catch (error) {
            throw new Error(`Error creating required wallet information: ${error}`);
        }
    }
    async createFundingPSBT(vault, bitcoinAmount, attestorGroupPublicKey, feeRateMultiplier, customFeeRate) {
        try {
            const { nativeSegwitPayment, taprootMultisigPayment } = await this.createPayments(vault.uuid, attestorGroupPublicKey);
            if (taprootMultisigPayment.address === undefined ||
                nativeSegwitPayment.address === undefined) {
                throw new Error('Payment Address is undefined');
            }
            const feeRate = customFeeRate ??
                BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));
            const addressBalance = await getBalance(nativeSegwitPayment.address, this.bitcoinBlockchainAPI);
            if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
                throw new Error('Insufficient Funds');
            }
            const fundingTransaction = await createFundingTransaction(bitcoinAmount, this.bitcoinNetwork, taprootMultisigPayment.address, nativeSegwitPayment, feeRate, vault.btcFeeRecipient, vault.btcMintFeeBasisPoints.toBigInt(), this.bitcoinBlockchainAPI);
            return fundingTransaction;
        }
        catch (error) {
            throw new Error(`Error creating Funding PSBT: ${error}`);
        }
    }
    async createWithdrawalPSBT(vault, withdrawAmount, attestorGroupPublicKey, fundingTransactionID, feeRateMultiplier, customFeeRate) {
        try {
            const { nativeSegwitPayment, taprootMultisigPayment } = await this.createPayments(vault.uuid, attestorGroupPublicKey);
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
    async createDepositPSBT(depositAmount, vault, attestorGroupPublicKey, fundingTransactionID, feeRateMultiplier, customFeeRate) {
        const { nativeSegwitPayment, taprootMultisigPayment } = await this.createPayments(vault.uuid, attestorGroupPublicKey);
        if (taprootMultisigPayment.address === undefined || nativeSegwitPayment.address === undefined) {
            throw new Error('Payment Address is undefined');
        }
        const feeRate = customFeeRate ??
            BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));
        const depositTransaction = await createDepositTransaction(this.bitcoinBlockchainAPI, this.bitcoinNetwork, depositAmount, fundingTransactionID, taprootMultisigPayment, nativeSegwitPayment, feeRate, vault.btcFeeRecipient, vault.btcMintFeeBasisPoints.toBigInt());
        return depositTransaction;
    }
}
