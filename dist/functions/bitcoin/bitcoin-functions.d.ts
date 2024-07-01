/// <reference types="node" resolution-mode="require"/>
import { Transaction } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { BIP32Interface } from 'bip32';
import { Network } from 'bitcoinjs-lib';
import { BitcoinInputSigningConfig, BitcoinTransaction, BitcoinTransactionVectorOutput, PaymentTypes } from '../../models/bitcoin-models.js';
export declare function getFeeAmount(bitcoinAmount: number, feeBasisPoints: number): number;
/**
 * Derives the Public Key at the Unhardened Path (0/0) from a given Extended Public Key.
 * @param extendedPublicKey - The base58-encoded Extended Public Key.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Public Key derived at the Unhardened Path.
 */
export declare function deriveUnhardenedPublicKey(extendedPublicKey: string, bitcoinNetwork: Network): Buffer;
/**
 * Derives the Account Key Pair from the Root Private Key.
 * @param rootPrivateKey - The Root Private Key.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param paymentType - The Payment Type to use.
 * @param accountIndex - The Account Index to use.
 * @returns The Account Key Pair.
 */
export declare function deriveUnhardenedKeyPairFromRootPrivateKey(rootPrivateKey: string, bitcoinNetwork: Network, paymentType: 'p2tr' | 'p2wpkh', accountIndex: number): BIP32Interface;
export declare function getXOnlyPublicKey(publicKey: Buffer): Buffer;
/**
 * Creates a Taproot Multisig Payment.
 * @param unspendableDerivedPublicKey - The Unspendable Derived Public Key.
 * @param attestorDerivedPublicKey - The Attestor Derived Public Key.
 * @param userDerivedPublicKey - The User Derived Public Key.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Taproot Multisig Payment.
 */
export declare function createTaprootMultisigPayment(unspendableDerivedPublicKey: Buffer, publicKeyA: Buffer, publicKeyB: Buffer, bitcoinNetwork: Network): P2TROut;
/**
 * Fetches the fee rate from the bitcoin blockchain API.
 *
 * @returns A promise that resolves to the hour fee rate.
 */
export declare function getFeeRate(bitcoinBlockchainAPIFeeURL: string, feeRateMultiplier?: number): Promise<number>;
/**
 * Gets the UTXOs of the User's Native Segwit Address.
 *
 * @param bitcoinNativeSegwitTransaction - The User's Native Segwit Payment Transaction.
 * @returns A Promise that resolves to the UTXOs of the User's Native Segwit Address.
 */
export declare function getUTXOs(bitcoinNativeSegwitTransaction: P2Ret | P2TROut, bitcoinBlockchainAPIURL: string): Promise<any>;
/**
 * Gets the Balance of the User's Bitcoin Address.
 *
 * @param bitcoinAddress - The User's Bitcoin Address.
 * @returns A Promise that resolves to the Balance of the User's Bitcoin Address.
 */
export declare function getBalance(bitcoinAddress: string, bitcoinBlockchainAPIURL: string): Promise<number>;
/**
 * Gets the Fee Recipient's Address from the Rcipient's Public Key.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Fee Recipient's Address.
 */
export declare function getFeeRecipientAddressFromPublicKey(feePublicKey: string, bitcoinNetwork: Network): string;
/**
 * Creates an Unspendable Key Committed to the Vault UUID.
 * @param vaultUUID - The UUID of the Vault.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Unspendable Key Committed to the Vault UUID.
 */
export declare function getUnspendableKeyCommittedToUUID(vaultUUID: string, bitcoinNetwork: Network): string;
/**
 * Creates the Bitcoin Input Signing Configuration.
 * @param psbt - The PSBT from which to create the Configuration.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Bitcoin Input Signing Configuration.
 */
export declare function createBitcoinInputSigningConfiguration(transaction: Transaction, walletAccountIndex: number, bitcoinNetwork: Network): BitcoinInputSigningConfig[];
/**
 * Returns the Bitcoin Input Signing Configuration and Payment Type Array for the given PSBT.
 * @param signingConfiguration - The Bitcoin Input Signing Configuration.
 * @param psbt - The PSBT.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 */
export declare function getInputByPaymentTypeArray(signingConfiguration: BitcoinInputSigningConfig[], psbt: Buffer, bitcoinNetwork: Network): [BitcoinInputSigningConfig, PaymentTypes][];
export declare function getValueMatchingInputFromTransaction(bitcoinTransaction: BitcoinTransaction, bitcoinValue: number): BitcoinTransactionVectorOutput;
export declare function validateScript(script: Uint8Array, outputScript: Uint8Array): boolean;
export declare function finalizeUserInputs(transaction: Transaction, userPayment: P2TROut | P2Ret): Transaction;
/**
 * Converts an ECDSA Public Key to a Schnorr Public Key.
 * @param publicKey - The ECDSA Public Key.
 */
export declare function ecdsaPublicKeyToSchnorr(publicKey: Buffer): Buffer;
