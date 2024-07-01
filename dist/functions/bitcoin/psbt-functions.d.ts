/// <reference types="node" resolution-mode="require"/>
import { Transaction } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { Network, Psbt } from 'bitcoinjs-lib';
import { PartialSignature } from 'ledger-bitcoin/build/main/lib/appClient.js';
import { BitcoinInputSigningConfig, PaymentTypes } from '../../models/bitcoin-models.js';
/**
 * Creates the initial Funding Transaction to fund the Multisig Transaction.
 *
 * @param bitcoinAmount - The amount of Bitcoin to fund the Transaction with.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param multisigAddress - The Multisig Address.
 * @param bitcoinNativeSegwitTransaction - The user's Native Segwit Payment Transaction.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Funding Transaction.
 */
export declare function createFundingTransaction(bitcoinAmount: bigint, bitcoinNetwork: Network, multisigAddress: string, bitcoinNativeSegwitTransaction: P2Ret, feeRate: bigint, feePublicKey: string, feeBasisPoints: bigint, bitcoinBlockchainAPIURL: string): Promise<Transaction>;
/**
 * Creates a Deposit Transaction.
 * Uses the existing Vault's Funding Transaction ID and additional UTXOs to create the Deposit Transaction.
 * The specified amount of Bitcoin is sent to the Vault's Multisig Address.
 * The remaining amount is sent back to the user's address.
 *
 * @param bitcoinBlockchainURL - The Bitcoin Blockchain URL.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param depositAmount - The Amount of Bitcoin to deposit.
 * @param vaultTransactionID - The ID of the Vault Funding Transaction.
 * @param multisigPayment - The Taproot Multisig Payment Transaction.
 * @param depositPayment - The User's Native Segwit or Taproot Payment Transaction which will be used to fund the Deposit Transaction.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Deposit Transaction.
 */
export declare function createDepositTransaction(bitcoinBlockchainURL: string, bitcoinNetwork: Network, depositAmount: bigint, vaultTransactionID: string, multisigPayment: P2TROut, depositPayment: P2TROut | P2Ret, feeRate: bigint, feePublicKey: string, feeBasisPoints: bigint): Promise<Transaction>;
/**
 * Creates a Withdrawal Transaction.
 * Uses the Funding Transaction's ID to create the Withdrawal Transaction.
 * The specified amount of Bitcoin is sent to the User's Native Segwit Address.
 * The remaining amount is sent back to the Multisig Transaction.
 *
 * @param bitcoinBlockchainURL - The Bitcoin Blockchain URL.
 * @param bitcoinAmount - The Amount of Bitcoin to withdraw.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param fundingTransactionID - The ID of the Funding Transaction.
 * @param multisigTransaction - The Multisig Transaction.
 * @param userNativeSegwitAddress - The User's Native Segwit Address.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Closing Transaction.
 */
export declare function createWithdrawalTransaction(bitcoinBlockchainURL: string, bitcoinAmount: bigint, bitcoinNetwork: Network, fundingTransactionID: string, multisigTransaction: P2TROut, userNativeSegwitAddress: string, feeRate: bigint, feePublicKey: string, feeBasisPoints: bigint): Promise<Transaction>;
/**
 * This function updates the PSBT with the necessary information to sign the inputs
 * that correspond to the given input signing configuration.
 * @param inputByPaymentType - An array of tuples containing the BitcoinInputSigningConfig
 * and the payment type of the input.
 * @param nativeSegwitPublicKey - The public key corresponding to the native segwit inputs.
 * @param masterFingerprint - The master fingerprint of the wallet.
 * @param psbt - The PSBT to update.
 * @returns The updated PSBT.
 * @throws An error if there is an issue adding the UTXO Ledger props or the BIP32 derivation.
 */
export declare function updateNativeSegwitInputs(inputsToUpdate: BitcoinInputSigningConfig[] | undefined, nativeSegwitPublicKey: Buffer, masterFingerprint: string, psbt: Psbt, bitcoinBlockchainAPIURL: string): Promise<Psbt>;
/**
 * This function returns the Native Segwit Inputs to sign from the given input signing configuration.
 * @param inputByPaymentType - An array of tuples containing the BitcoinInputSigningConfig
 * and the payment type of the input.
 * @returns An array of BitcoinInputSigningConfig objects.
 */
export declare function getNativeSegwitInputsToSign(inputByPaymentType: [BitcoinInputSigningConfig, PaymentTypes][]): BitcoinInputSigningConfig[];
/**
 * This function updates the PSBT with the necessary information to sign the inputs
 * that correspond to the given input signing configuration.
 * @param inputsToUpdate - An array of BitcoinInputSigningConfig objects.
 * @param taprootPublicKey - The public key corresponding to the taproot inputs.
 * @param masterFingerprint - The master fingerprint of the wallet.
 * @param psbt - The PSBT to update.
 * @returns The updated PSBT.
 */
export declare function updateTaprootInputs(inputsToUpdate: BitcoinInputSigningConfig[] | undefined, taprootPublicKey: Buffer, masterFingerprint: string, psbt: Psbt): Promise<Psbt>;
/**
 * This function returns the Taproot Inputs to sign from the given input signing configuration.
 * @param inputByPaymentType - An array of tuples containing the BitcoinInputSigningConfig
 * and the payment type of the input.
 * @returns An array of BitcoinInputSigningConfig objects.
 */
export declare function getTaprootInputsToSign(inputByPaymentType: [BitcoinInputSigningConfig, PaymentTypes][]): BitcoinInputSigningConfig[];
/**
 * This function updates the PSBT with the received Native Segwit Signatures.
 * @param psbt - The PSBT to update.
 * @param signatures - An array of tuples containing the index of the input and the PartialSignature.
 * @returns The updated PSBT.
 */
export declare function addNativeSegwitSignaturesToPSBT(psbt: Psbt, signatures: [number, PartialSignature][]): void;
/**
 * This function updates the PSBT with the received Taproot Signatures.
 * @param psbt - The PSBT to update.
 * @param signatures - An array of tuples containing the index of the input and the PartialSignature.
 * @returns The updated PSBT.
 */
export declare function addTaprootInputSignaturesToPSBT(psbt: Psbt, signatures: [number, PartialSignature][]): void;
