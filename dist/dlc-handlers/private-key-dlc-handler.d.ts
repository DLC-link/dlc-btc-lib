import { Transaction } from '@scure/btc-signer';
import { Network } from 'bitcoinjs-lib';
import { PaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';
export declare class PrivateKeyDLCHandler {
    private derivedKeyPair;
    payment: PaymentInformation | undefined;
    private bitcoinNetwork;
    private bitcoinBlockchainAPI;
    private bitcoinBlockchainFeeRecommendationAPI;
    constructor(bitcoinWalletPrivateKey: string, walletAccountIndex: number, bitcoinNetwork: Network, bitcoinBlockchainAPI?: string, bitcoinBlockchainFeeRecommendationAPI?: string);
    private setPayment;
    private getPayment;
    getTaprootDerivedPublicKey(): string;
    getVaultRelatedAddress(paymentType: 'p2wpkh' | 'p2tr'): string;
    private getPrivateKey;
    private createPayments;
    createFundingPSBT(vault: RawVault, bitcoinAmount: bigint, attestorGroupPublicKey: string, feeRateMultiplier?: number, customFeeRate?: bigint): Promise<Transaction>;
    createWithdrawalPSBT(vault: RawVault, withdrawAmount: bigint, attestorGroupPublicKey: string, fundingTransactionID: string, feeRateMultiplier?: number, customFeeRate?: bigint): Promise<Transaction>;
    signPSBT(psbt: Transaction, transactionType: 'funding' | 'deposit' | 'withdraw'): Transaction;
    createDepositPSBT(depositAmount: bigint, vault: RawVault, attestorGroupPublicKey: string, fundingTransactionID: string, feeRateMultiplier?: number, customFeeRate?: bigint): Promise<Transaction>;
}
