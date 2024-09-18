import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { FetchedRawTransaction, UTXO } from 'bitcoin-core';

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
    const response = await client.getRawTransaction(txID);
    if (typeof response === 'string') {
      console.log('Error or message:', response);
      throw new Error(`Error fetching Bitcoin Transaction: ${response}`);
    } else {
      console.log('FetchedRawTransaction:', response);
      return response;
    }
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
export async function getBalanceByAddress(
  bitcoinAddress: string,
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
): Promise<number> {
  try {
    const client = bitcoinCoreRpcConnection.getClient();
    const utxo = client.getBalance(bitcoinAddress);
    console.log('UTXO:', utxo);
    return utxo;
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
  payment: P2Ret | P2TROut,
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
): Promise<number> {
  try {
    const client = bitcoinCoreRpcConnection.getClient();
    const userAddress = payment.address;
    if (!userAddress) {
      throw new Error('Payment is missing Address');
    }
    const utxo = await client.getBalance(userAddress);
    console.log('UTXO:', utxo);
    return utxo;
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

      const { scriptPubKey } = validationResult;

      if (!scriptPubKey) {
        throw new Error(`Unable to get scriptPubKey for address ${userAddress}`);
      }

      console.log(`Address: ${userAddress} | ScriptPubKey: ${scriptPubKey}`);

      // Step 2: Use scantxoutset to scan UTXOs related to the address
      const scanResult = await client.command('scantxoutset', 'start', [
        { desc: `addr(${userAddress})` },
      ]);

      if (scanResult.success && scanResult.unspents.length > 0) {
        console.log(`UTXOs for ${userAddress}:`);
        const modifiedUTXOs = scanResult.unspents.forEach((utxo: any) => {
          console.log('UTXO:', utxo);
          async (utxo: UTXO) => {
            return {
              ...payment,
              txid: utxo.txid,
              index: utxo.vout,
              value: utxo.amount,
              witnessUtxo: {
                script: payment.script,
                amount: BigInt(utxo.amount),
              },
              redeemScript: payment.redeemScript,
            };
          };
        });

        return modifiedUTXOs;
      } else {
        console.log(`No UTXOs found for address ${userAddress}.`);
      }
    } catch (error) {
      console.error(`Error fetching UTXOs for address ${userAddress}:`, error);
    }
  }
}
