import { Transaction } from '@scure/btc-signer';
import { Network } from 'bitcoinjs-lib';
import { PaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';
export declare class SoftwareWalletDLCHandler {
    private nativeSegwitDerivedPublicKey;
    private taprootDerivedPublicKey;
    payment: PaymentInformation | undefined;
    private bitcoinNetwork;
    private bitcoinBlockchainAPI;
    private bitcoinBlockchainFeeRecommendationAPI;
    constructor(nativeSegwitDerivedPublicKey: string, taprootDerivedPublicKey: string, bitcoinNetwork: Network, bitcoinBlockchainAPI?: string, bitcoinBlockchainFeeRecommendationAPI?: string);
    private setPayment;
    private getPayment;
    getTaprootDerivedPublicKey(): string;
    getVaultRelatedAddress(paymentType: 'p2wpkh' | 'p2tr'): string;
    private createPayments;
    createFundingPSBT(vault: RawVault, bitcoinAmount: bigint, attestorGroupPublicKey: string, feeRateMultiplier?: number, customFeeRate?: bigint): Promise<Transaction>;
    createWithdrawalPSBT(vault: RawVault, withdrawAmount: bigint, attestorGroupPublicKey: string, fundingTransactionID: string, feeRateMultiplier?: number, customFeeRate?: bigint): Promise<Transaction>;
    createDepositPSBT(depositAmount: bigint, vault: RawVault, attestorGroupPublicKey: string, fundingTransactionID: string, feeRateMultiplier?: number, customFeeRate?: bigint): Promise<Transaction>;
}
