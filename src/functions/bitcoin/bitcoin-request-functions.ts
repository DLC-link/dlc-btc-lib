import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { FetchedRawTransaction } from 'bitcoin-simple-rpc';

import { UTXO } from '../../models/bitcoin-models.js';
import { BitcoinCoreRpcConnection } from './bitcoincore-rpc-connection.js';

/**
 * Fetches the Bitcoin Transaction from the Bitcoin Network.
 *
 * @param txID - The Transaction ID of the Bitcoin Transaction.
 * @param bitcoinBlockchainAPI - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Bitcoin Transaction.
 */
export async function fetchBitcoinTransaction(
  txID: string,
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
): Promise<FetchedRawTransaction> {
  try {
    // const bitcoinBlockchainAPITransactionEndpoint = `${bitcoinBlockchainAPI}/tx/${txID}`;
    // const response = await fetch(bitcoinBlockchainAPITransactionEndpoint);

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
 * @param bitcoinBlockchainAPI - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Response from the Broadcast Request.
 */
export async function broadcastTransaction(
  transaction: string,
  auth: BitcoinCoreRpcConnection
): Promise<void> {
  try {
    // const response = await fetch(`${bitcoinBlockchainAPI}/tx`, {
    //   method: 'POST',
    //   body: transaction,
    // });
    const client = auth.getClient();
    const response = client.sendRawTransaction(transaction);
    console.log('Response:', response);

    // if (!response.ok) {
    //   throw new Error(`Error while broadcasting Bitcoin Transaction: ${await response.text()}`);
    // }

    // const transactionID = await response.text();

    // return transactionID;
  } catch (error) {
    throw new Error(`Error broadcasting Transaction: ${error}`);
  }
}

/**
 * Fetches the Current Block Height of the Bitcoin Network.
 *
 * @param bitcoinBlockchainAPI - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Current Block Height of the Bitcoin Network.
 */
export async function fetchBitcoinBlockchainBlockHeight(
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
  // bitcoinBlockchainAPI: string
): Promise<number> {
  try {
    // const bitcoinBlockchainBlockHeightURL = `${bitcoinBlockchainAPI}/blocks/tip/height`;

    // const response = await fetch(bitcoinBlockchainBlockHeightURL);

    // if (!response.ok)
    //   throw new Error(
    //     `Bitcoin Network Block Height Network Response was not OK: ${response.statusText}`
    //   );

    // return await response.json();

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
 * @param bitcoinBlockHeight - The Current Block Height of the Bitcoin Network.
 * @returns A Promise that resolves to a Boolean indicating if the Transaction has the required number of Confirmations.
 */
export async function checkBitcoinTransactionConfirmations(
  bitcoinTransaction: FetchedRawTransaction,
  bitcoinBlockHeight: number
): Promise<boolean> {
  try {
    // if (!bitcoinTransaction.status.block_height) {
    //   throw new Error('Funding Transaction has no Block Height.');
    // }

    // const confirmations = bitcoinBlockHeight - (bitcoinTransaction.status.block_height + 1);
    // if (confirmations >= 6) {
    //   return true;
    // }
    // return false;
    console.log('bitcoinTransaction:', bitcoinTransaction);
    console.log('bitcoinBlockHeight:', bitcoinBlockHeight);
    return bitcoinTransaction.confirmations >= 6;
  } catch (error) {
    throw new Error(`Error checking Bitcoin Transaction Confirmations: ${error}`);
  }
}

/**
 * Return the Balance of the User's Bitcoin Address in Satoshis.
 *
 * @param bitcoinAddress - The User's Bitcoin Address.
 * @param bitcoinBlockchainAPIURL - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Balance of the User's Bitcoin Address.
 */
export async function getBalanceByAddress(
  bitcoinAddress: string,
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
  // bitcoinBlockchainAPIURL: string
): Promise<number> {
  // const utxoResponse = await fetch(`${bitcoinBlockchainAPIURL}/address/${bitcoinAddress}/utxo`);

  // if (!utxoResponse.ok) {
  //   throw new Error(`Error getting UTXOs: ${utxoResponse.statusText}`);
  // }

  // const userUTXOs: UTXO[] = await utxoResponse.json();

  // return userUTXOs.reduce((total, utxo) => total + utxo.value, 0);
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
 * @param bitcoinBlockchainAPIURL - The Bitcoin Blockchain URL used to fetch the  User's UTXOs.
 * @returns A Promise that resolves to the Balance of the User's Bitcoin Address.
 */
export async function getBalanceByPayment(
  payment: P2Ret | P2TROut,
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection
  // bitcoinBlockchainAPIURL: string
): Promise<number> {
  // const userAddress = payment.address;

  // if (!userAddress) {
  //   throw new Error('Payment is missing Address');
  // }

  // const utxoResponse = await fetch(`${bitcoinBlockchainAPIURL}/address/${userAddress}/utxo`);

  // if (!utxoResponse.ok) {
  //   throw new Error(`Error getting UTXOs: ${utxoResponse.statusText}`);
  // }

  // const userUTXOs: UTXO[] = await utxoResponse.json();

  // const balanceInSats = userUTXOs.reduce((total, utxo) => total + utxo.value, 0);

  // return balanceInSats;
  try {
    const client = bitcoinCoreRpcConnection.getClient();
    const userAddress = payment.address;
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
 * @param bitcoinBlockchainAPIURL - The Bitcoin Blockchain URL used to fetch the  User's UTXOs.
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
    const userUTXOs = await client.listUnspent(undefined, undefined, [userAddress]);
    const modifiedUTXOs = userUTXOs.forEach(utxo => {
      console.log('UTXO:', utxo);
      async (utxo: UTXO) => {
        return {
          ...payment,
          txid: utxo.txid,
          index: utxo.vout,
          value: utxo.value,
          witnessUtxo: {
            script: payment.script,
            amount: BigInt(utxo.value),
          },
          redeemScript: payment.redeemScript,
        };
      };
    });

    return modifiedUTXOs;
  }
}
