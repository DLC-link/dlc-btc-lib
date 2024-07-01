import { bytesToHex } from '@noble/hashes/utils';
import { Transaction } from '@scure/btc-signer';
import { p2wpkh } from '@scure/btc-signer/payment';
import { Psbt } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import { DefaultWalletPolicy, WalletPolicy } from 'ledger-bitcoin';
import { createBitcoinInputSigningConfiguration, createTaprootMultisigPayment, deriveUnhardenedPublicKey, getBalance, getFeeRate, getInputByPaymentTypeArray, getUnspendableKeyCommittedToUUID, } from '../functions/bitcoin/bitcoin-functions.js';
import { addNativeSegwitSignaturesToPSBT, addTaprootInputSignaturesToPSBT, createDepositTransaction, createFundingTransaction, createWithdrawalTransaction, getNativeSegwitInputsToSign, getTaprootInputsToSign, updateNativeSegwitInputs, updateTaprootInputs, } from '../functions/bitcoin/psbt-functions.js';
import { truncateAddress } from '../utilities/index.js';
export class LedgerDLCHandler {
    ledgerApp;
    masterFingerprint;
    walletAccountIndex;
    policyInformation;
    payment;
    bitcoinNetwork;
    bitcoinBlockchainAPI;
    bitcoinBlockchainFeeRecommendationAPI;
    constructor(ledgerApp, masterFingerprint, walletAccountIndex, bitcoinNetwork, bitcoinBlockchainAPI, bitcoinBlockchainFeeRecommendationAPI) {
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
        this.ledgerApp = ledgerApp;
        this.masterFingerprint = masterFingerprint;
        this.walletAccountIndex = walletAccountIndex;
        this.bitcoinNetwork = bitcoinNetwork;
    }
    setPolicyInformation(nativeSegwitWalletPolicy, taprootMultisigWalletPolicy, taprootMultisigWalletPolicyHMac) {
        this.policyInformation = {
            nativeSegwitWalletPolicy,
            taprootMultisigWalletPolicy,
            taprootMultisigWalletPolicyHMac,
        };
    }
    setPayment(nativeSegwitPayment, nativeSegwitDerivedPublicKey, taprootMultisigPayment, taprootDerivedPublicKey) {
        this.payment = {
            nativeSegwitPayment,
            nativeSegwitDerivedPublicKey,
            taprootMultisigPayment,
            taprootDerivedPublicKey,
        };
    }
    getPolicyInformation() {
        if (!this.policyInformation) {
            throw new Error('Policy Information not set');
        }
        return this.policyInformation;
    }
    getPayment() {
        if (!this.payment) {
            throw new Error('Payment Information not set');
        }
        return this.payment;
    }
    getTaprootDerivedPublicKey() {
        return bytesToHex(this.getPayment().taprootDerivedPublicKey);
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
    async createPayment(vaultUUID, attestorGroupPublicKey) {
        try {
            const networkIndex = this.bitcoinNetwork === bitcoin ? 0 : 1;
            const nativeSegwitExtendedPublicKey = await this.ledgerApp.getExtendedPubkey(`m/84'/${networkIndex}'/${this.walletAccountIndex}'`);
            const nativeSegwitKeyinfo = `[${this.masterFingerprint}/84'/${networkIndex}'/${this.walletAccountIndex}']${nativeSegwitExtendedPublicKey}`;
            const nativeSegwitWalletPolicy = new DefaultWalletPolicy('wpkh(@0/**)', nativeSegwitKeyinfo);
            const nativeSegwitAddress = await this.ledgerApp.getWalletAddress(nativeSegwitWalletPolicy, null, 0, 0, false);
            const nativeSegwitDerivedPublicKey = deriveUnhardenedPublicKey(nativeSegwitExtendedPublicKey, this.bitcoinNetwork);
            const nativeSegwitPayment = p2wpkh(nativeSegwitDerivedPublicKey, this.bitcoinNetwork);
            if (nativeSegwitPayment.address !== nativeSegwitAddress) {
                throw new Error(`[Ledger] Recreated Native Segwit Address does not match the Ledger Native Segwit Address`);
            }
            const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
            const unspendableDerivedPublicKey = deriveUnhardenedPublicKey(unspendablePublicKey, this.bitcoinNetwork);
            const attestorDerivedPublicKey = deriveUnhardenedPublicKey(attestorGroupPublicKey, this.bitcoinNetwork);
            const taprootExtendedPublicKey = await this.ledgerApp.getExtendedPubkey(`m/86'/${networkIndex}'/${this.walletAccountIndex}'`);
            const ledgerTaprootKeyInfo = `[${this.masterFingerprint}/86'/${networkIndex}'/${this.walletAccountIndex}']${taprootExtendedPublicKey}`;
            const taprootDerivedPublicKey = deriveUnhardenedPublicKey(taprootExtendedPublicKey, this.bitcoinNetwork);
            const descriptors = taprootDerivedPublicKey.toString('hex') < attestorDerivedPublicKey.toString('hex')
                ? [ledgerTaprootKeyInfo, attestorGroupPublicKey]
                : [attestorGroupPublicKey, ledgerTaprootKeyInfo];
            const taprootMultisigAccountPolicy = new WalletPolicy(`Taproot Multisig Wallet for Vault: ${truncateAddress(vaultUUID)}`, `tr(@0/**,and_v(v:pk(@1/**),pk(@2/**)))`, [unspendablePublicKey, ...descriptors]);
            const [, taprootMultisigPolicyHMac] = await this.ledgerApp.registerWallet(taprootMultisigAccountPolicy);
            const taprootMultisigAddress = await this.ledgerApp.getWalletAddress(taprootMultisigAccountPolicy, taprootMultisigPolicyHMac, 0, 0, false);
            const taprootMultisigPayment = createTaprootMultisigPayment(unspendableDerivedPublicKey, attestorDerivedPublicKey, taprootDerivedPublicKey, this.bitcoinNetwork);
            if (taprootMultisigAddress !== taprootMultisigPayment.address) {
                throw new Error(`Recreated Multisig Address does not match the Ledger Multisig Address`);
            }
            this.setPolicyInformation(nativeSegwitWalletPolicy, taprootMultisigAccountPolicy, taprootMultisigPolicyHMac);
            this.setPayment(nativeSegwitPayment, nativeSegwitDerivedPublicKey, taprootMultisigPayment, taprootDerivedPublicKey);
            return {
                nativeSegwitPayment,
                nativeSegwitDerivedPublicKey,
                taprootMultisigPayment,
                taprootDerivedPublicKey,
            };
        }
        catch (error) {
            throw new Error(`Error creating required wallet information: ${error}`);
        }
    }
    async createFundingPSBT(vault, bitcoinAmount, attestorGroupPublicKey, feeRateMultiplier, customFeeRate) {
        try {
            const { nativeSegwitPayment, nativeSegwitDerivedPublicKey, taprootMultisigPayment } = await this.createPayment(vault.uuid, attestorGroupPublicKey);
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
            const signingConfiguration = createBitcoinInputSigningConfiguration(fundingTransaction, this.walletAccountIndex, this.bitcoinNetwork);
            const formattedFundingPSBT = Psbt.fromBuffer(Buffer.from(fundingTransaction.toPSBT()), {
                network: this.bitcoinNetwork,
            });
            const inputByPaymentTypeArray = getInputByPaymentTypeArray(signingConfiguration, formattedFundingPSBT.toBuffer(), this.bitcoinNetwork);
            const nativeSegwitInputsToSign = getNativeSegwitInputsToSign(inputByPaymentTypeArray);
            await updateNativeSegwitInputs(nativeSegwitInputsToSign, nativeSegwitDerivedPublicKey, this.masterFingerprint, formattedFundingPSBT, this.bitcoinBlockchainAPI);
            return formattedFundingPSBT;
        }
        catch (error) {
            throw new Error(`Error creating Funding PSBT: ${error}`);
        }
    }
    async createWithdrawalPSBT(vault, withdrawAmount, attestorGroupPublicKey, fundingTransactionID, feeRateMultiplier, customFeeRate) {
        try {
            const { nativeSegwitPayment, taprootDerivedPublicKey, taprootMultisigPayment } = await this.createPayment(vault.uuid, attestorGroupPublicKey);
            if (taprootMultisigPayment.address === undefined ||
                nativeSegwitPayment.address === undefined) {
                throw new Error('Payment Address is undefined');
            }
            const feeRate = customFeeRate ??
                BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));
            const withdrawalTransaction = await createWithdrawalTransaction(this.bitcoinBlockchainAPI, withdrawAmount, this.bitcoinNetwork, fundingTransactionID, taprootMultisigPayment, nativeSegwitPayment.address, feeRate, vault.btcFeeRecipient, vault.btcRedeemFeeBasisPoints.toBigInt());
            const withdrawalTransactionSigningConfiguration = createBitcoinInputSigningConfiguration(withdrawalTransaction, this.walletAccountIndex, this.bitcoinNetwork);
            const formattedWithdrawalPSBT = Psbt.fromBuffer(Buffer.from(withdrawalTransaction.toPSBT()), {
                network: this.bitcoinNetwork,
            });
            const withdrawalInputByPaymentTypeArray = getInputByPaymentTypeArray(withdrawalTransactionSigningConfiguration, formattedWithdrawalPSBT.toBuffer(), this.bitcoinNetwork);
            const taprootInputsToSign = getTaprootInputsToSign(withdrawalInputByPaymentTypeArray);
            await updateTaprootInputs(taprootInputsToSign, taprootDerivedPublicKey, this.masterFingerprint, formattedWithdrawalPSBT);
            return formattedWithdrawalPSBT;
        }
        catch (error) {
            throw new Error(`Error creating Withdrawal PSBT: ${error}`);
        }
    }
    async createDepositPSBT(depositAmount, vault, attestorGroupPublicKey, fundingTransactionID, feeRateMultiplier, customFeeRate) {
        const { nativeSegwitPayment, taprootDerivedPublicKey, nativeSegwitDerivedPublicKey, taprootMultisigPayment, } = await this.createPayment(vault.uuid, attestorGroupPublicKey);
        if (taprootMultisigPayment.address === undefined || nativeSegwitPayment.address === undefined) {
            throw new Error('Payment Address is undefined');
        }
        const feeRate = customFeeRate ??
            BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));
        const depositTransaction = await createDepositTransaction(this.bitcoinBlockchainAPI, this.bitcoinNetwork, depositAmount, fundingTransactionID, taprootMultisigPayment, nativeSegwitPayment, feeRate, vault.btcFeeRecipient, vault.btcMintFeeBasisPoints.toBigInt());
        const depositTransactionSigningConfiguration = createBitcoinInputSigningConfiguration(depositTransaction, this.walletAccountIndex, this.bitcoinNetwork);
        const formattedDepositPSBT = Psbt.fromBuffer(Buffer.from(depositTransaction.toPSBT()), {
            network: this.bitcoinNetwork,
        });
        const withdrawalInputByPaymentTypeArray = getInputByPaymentTypeArray(depositTransactionSigningConfiguration, formattedDepositPSBT.toBuffer(), this.bitcoinNetwork);
        const taprootInputsToSign = getTaprootInputsToSign(withdrawalInputByPaymentTypeArray);
        const nativeSegwitInputsToSign = getNativeSegwitInputsToSign(withdrawalInputByPaymentTypeArray);
        await updateTaprootInputs(taprootInputsToSign, taprootDerivedPublicKey, this.masterFingerprint, formattedDepositPSBT);
        await updateNativeSegwitInputs(nativeSegwitInputsToSign, nativeSegwitDerivedPublicKey, this.masterFingerprint, formattedDepositPSBT, this.bitcoinBlockchainAPI);
        return formattedDepositPSBT;
    }
    async signPSBT(psbt, transactionType) {
        try {
            const { nativeSegwitWalletPolicy, taprootMultisigWalletPolicy, taprootMultisigWalletPolicyHMac, } = this.getPolicyInformation();
            let signatures;
            let transaction;
            switch (transactionType) {
                case 'funding':
                    signatures = await this.ledgerApp.signPsbt(psbt.toBase64(), nativeSegwitWalletPolicy, null);
                    addNativeSegwitSignaturesToPSBT(psbt, signatures);
                    transaction = Transaction.fromPSBT(psbt.toBuffer());
                    transaction.finalize();
                    return transaction;
                case 'deposit':
                    signatures = await this.ledgerApp.signPsbt(psbt.toBase64(), taprootMultisigWalletPolicy, taprootMultisigWalletPolicyHMac);
                    addTaprootInputSignaturesToPSBT(psbt, signatures);
                    signatures = await this.ledgerApp.signPsbt(psbt.toBase64(), nativeSegwitWalletPolicy, null);
                    addNativeSegwitSignaturesToPSBT(psbt, signatures);
                    transaction = Transaction.fromPSBT(psbt.toBuffer());
                    return transaction;
                case 'closing':
                    signatures = await this.ledgerApp.signPsbt(psbt.toBase64(), taprootMultisigWalletPolicy, taprootMultisigWalletPolicyHMac);
                    addTaprootInputSignaturesToPSBT(psbt, signatures);
                    transaction = Transaction.fromPSBT(psbt.toBuffer());
                    return transaction;
                default:
                    throw new Error('Invalid Transaction Type');
            }
        }
        catch (error) {
            throw new Error(`Error signing PSBT: ${error}`);
        }
    }
}
