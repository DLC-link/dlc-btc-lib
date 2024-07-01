import { Transaction } from '@scure/btc-signer';
import { Network, Psbt } from 'bitcoinjs-lib';
import { AppClient } from 'ledger-bitcoin';
import { ExtendedPaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';
export declare class LedgerDLCHandler {
    private ledgerApp;
    private masterFingerprint;
    private walletAccountIndex;
    private policyInformation;
    payment: ExtendedPaymentInformation | undefined;
    private bitcoinNetwork;
    private bitcoinBlockchainAPI;
    private bitcoinBlockchainFeeRecommendationAPI;
    constructor(ledgerApp: AppClient, masterFingerprint: string, walletAccountIndex: number, bitcoinNetwork: Network, bitcoinBlockchainAPI?: string, bitcoinBlockchainFeeRecommendationAPI?: string);
    private setPolicyInformation;
    private setPayment;
    private getPolicyInformation;
    private getPayment;
    getTaprootDerivedPublicKey(): string;
    getVaultRelatedAddress(paymentType: 'p2wpkh' | 'p2tr'): string;
    private createPayment;
    createFundingPSBT(vault: RawVault, bitcoinAmount: bigint, attestorGroupPublicKey: string, feeRateMultiplier?: number, customFeeRate?: bigint): Promise<Psbt>;
    createWithdrawalPSBT(vault: RawVault, withdrawAmount: bigint, attestorGroupPublicKey: string, fundingTransactionID: string, feeRateMultiplier?: number, customFeeRate?: bigint): Promise<Psbt>;
    createDepositPSBT(depositAmount: bigint, vault: RawVault, attestorGroupPublicKey: string, fundingTransactionID: string, feeRateMultiplier?: number, customFeeRate?: bigint): Promise<Psbt>;
    signPSBT(psbt: Psbt, transactionType: 'funding' | 'deposit' | 'closing'): Promise<Transaction>;
}
