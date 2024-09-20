import { bytesToHex } from '@noble/hashes/utils';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { FetchedRawTransaction, UTXO } from 'bitcoin-core';

import { ModifiedUTXO } from '../../models/bitcoin-models.js';
import { BitcoinCoreRpcConnection } from './bitcoincore-rpc-connection.js';

/**
 * Fetches the Bitcoin Transaction from the Bitcoin Network.
 *
 * @param txID - The Transaction ID of the Bitcoin Transaction.
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @returns A Promise that resolves to the Bitcoin Transaction.
 */
export async function fetchBitcoinTransaction(
  txID: string,
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
): Promise<FetchedRawTransaction> {
  try {
    const client = bitcoinCoreRpcConnection.getClient();
    console.log('Fetching Raw Transaction in verbose mode:', txID);
    const result = await client.command('getrawtransaction', txID, true);
    console.log('Raw Transaction:', result);
    return result; // figure out HOW to make it so that we have Satoshis values in vout/vin
  } catch (error) {
    throw new Error(`Error fetching Bitcoin Transaction: ${error}`);
  }
}

/**
 * Broadcasts the Transaction to the Bitcoin Network.
 *
 * @param transaction - The Transaction to broadcast.
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @returns A Promise that resolves to the Response from the Broadcast Request.
 */
export async function broadcastTransaction(
  transaction: string,
  bitcoincoreRpcConnection: BitcoinCoreRpcConnection
): Promise<void> {
  try {
    const client = bitcoincoreRpcConnection.getClient();
    const response = client.sendRawTransaction(transaction);
    console.log('Response:', response);
  } catch (error) {
    throw new Error(`Error broadcasting Transaction: ${error}`);
  }
}

/**
 * Fetches the Current Block Height of the Bitcoin Network.
 *
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @returns A Promise that resolves to the Current Block Height of the Bitcoin Network.
 */
export async function fetchBitcoinBlockchainBlockHeight(
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
): Promise<number> {
  try {
    const client = bitcoinCoreRpcConnection.getClient();
    const blockCount = await client.getBlockCount();
    console.log('Block Count:', blockCount);
    return blockCount;
  } catch (error) {
    throw new Error(`Error fetching Bitcoin Blockchain Block Height: ${error}`);
  }
}

/**
 * Checks if the Bitcoin Transaction has the required number of Confirmations.
 *
 * @param bitcoinTransaction - The Bitcoin Transaction to check.
 * @returns A Promise that resolves to a Boolean indicating if the Transaction has the required number of Confirmations.
 */
export async function checkBitcoinTransactionConfirmations(
  bitcoinTransaction: FetchedRawTransaction
): Promise<boolean> {
  return bitcoinTransaction.confirmations >= 6;
}

/**
 * Return the Balance of the User's Bitcoin Address in Satoshis.
 *
 * @param bitcoinAddress - The User's Bitcoin Address.
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @returns A Promise that resolves to the Balance of the User's Bitcoin Address.
 */
// TODO: check where it's used and if we need it at all!
export async function getBalanceByAddress(
  taprootDerivedPublicKey: Buffer,
  bitcoinAddress: string,
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
): Promise<number> {
  try {
    const client = bitcoinCoreRpcConnection.getClient();
    const pkString = bytesToHex(taprootDerivedPublicKey);

    const descriptors = [{ desc: `tr(${pkString})` }];
    const userUTXO = await client.command('scantxoutset', 'start', descriptors);

    const totalAmount = userUTXO.total_amount;
    if (!totalAmount) {
      return userUTXO.unspents.reduce(
        (acc: number, utxo: { amount: number }) => acc + Math.round(utxo.amount * 100_000_000),
        0
      );
    }
    return Math.round(totalAmount * 100_000_000);
  } catch (error) {
    throw new Error(`Error getting UTXOs: ${error}`);
  }
}

/**
 * Gets the Balance of a given Bitcoin Payment object's Address.
 *
 * @param payment - The Payment object to get the Balance of.
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @returns A Promise that resolves to the Balance of the User's Bitcoin Address.
 */
export async function getBalanceByPayment(
  fundingDerivedPublicKey: Buffer,
  paymentType: string,
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
): Promise<number> {
  try {
    const client = bitcoinCoreRpcConnection.getClient();
    const pkString = bytesToHex(fundingDerivedPublicKey);

    const descriptors = [{ desc: `${paymentType}(${pkString})` }];
    const userUTXO = await client.command('scantxoutset', 'start', descriptors);

    const totalAmount = userUTXO.total_amount;
    if (!totalAmount) {
      return userUTXO.unspents.reduce(
        (acc: number, utxo: { amount: number }) => acc + Math.round(utxo.amount * 100_000_000),
        0
      );
    }
    return Math.round(totalAmount * 100_000_000);
  } catch (error) {
    throw new Error(`Error getting UTXOs: ${error}`);
  }
}

/**
 * Gets the UTXOs of a given Bitcoin Payment object's Address.
 *
 * @param payment - The Payment object to get the Balance of.
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 */
export async function getUTXOs(
  payment: P2Ret | P2TROut,
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
): Promise<any> {
  const userAddress = payment.address;
  if (!userAddress) {
    throw new Error('Payment is missing Address');
  } else {
    const client = bitcoinCoreRpcConnection.getClient();
    try {
      // Step 1: Validate the address and retrieve scriptPubKey
      const validationResult = await client.command('validateaddress', userAddress);

      if (!validationResult.isvalid) {
        throw new Error(`Address ${userAddress} is not valid.`);
      }

      const scriptPubKey = validationResult.scriptPubKey;

      if (!scriptPubKey) {
        throw new Error(`Unable to get scriptPubKey for address ${userAddress}`);
      }

      console.log(`Address: ${userAddress} | ScriptPubKey: ${scriptPubKey}`);

      // Step 2: Use scantxoutset to scan UTXOs related to the address
      const scanResult = await client.command('scantxoutset', 'start', [
        { desc: `addr(${userAddress})` },
      ]);

      if (scanResult.success && scanResult.unspents.length > 0) {
        const modifiedUTXOs = await Promise.all(
          scanResult.unspents.map(async (utxo: UTXO) => {
            console.log('ModifiedUTXO - UTXO:', utxo);
            console.log('ModifiedUTXO - Payment:', utxo.amount);
            return new ModifiedUTXO(payment, utxo);
          })
        );

        return modifiedUTXOs;
      } else {
        console.log(`No UTXOs found for address ${userAddress}.`);
      }
    } catch (error) {
      console.error(`Error fetching UTXOs for address ${userAddress}:`, error);
    }
  }
}
