import { BitcoinTransaction } from '../../models/bitcoin-models.js';
/**
 * Fetches the Bitcoin Transaction from the Bitcoin Network.
 *
 * @param txID - The Transaction ID of the Bitcoin Transaction.
 * @param bitcoinBlockchainAPI - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Bitcoin Transaction.
 */
export declare function fetchBitcoinTransaction(txID: string, bitcoinBlockchainAPI: string): Promise<BitcoinTransaction>;
/**
 * Broadcasts the Transaction to the Bitcoin Network.
 *
 * @param transaction - The Transaction to broadcast.
 * @param bitcoinBlockchainAPI - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Response from the Broadcast Request.
 */
export declare function broadcastTransaction(transaction: string, bitcoinBlockchainAPI: string): Promise<string>;
/**
 * Fetches the Current Block Height of the Bitcoin Network.
 *
 * @param bitcoinBlockchainAPI - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Current Block Height of the Bitcoin Network.
 */
export declare function fetchBitcoinBlockchainBlockHeight(bitcoinBlockchainAPI: string): Promise<number>;
/**
 * Checks if the Bitcoin Transaction has the required number of Confirmations.
 *
 * @param bitcoinTransaction - The Bitcoin Transaction to check.
 * @param bitcoinBlockHeight - The Current Block Height of the Bitcoin Network.
 * @returns A Promise that resolves to a Boolean indicating if the Transaction has the required number of Confirmations.
 */
export declare function checkBitcoinTransactionConfirmations(bitcoinTransaction: BitcoinTransaction, bitcoinBlockHeight: number): Promise<boolean>;
/**
 * Return the Balance of the User's Bitcoin Address in Satoshis.
 *
 * @param bitcoinAddress - The User's Bitcoin Address.
 * @param bitcoinBlockchainAPIURL - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Balance of the User's Bitcoin Address.
 */
export declare function getBalance(bitcoinAddress: string, bitcoinBlockchainAPIURL: string): Promise<number>;
