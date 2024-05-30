import { BitcoinTransaction } from '@models/bitcoin-models.js';

export async function fetchBitcoinTransaction(
  txID: string,
  bitcoinBlockchainAPI: string
): Promise<BitcoinTransaction> {
  try {
    const bitcoinBlockchainAPITransactionEndpoint = `${bitcoinBlockchainAPI}/tx/${txID}`;

    const response = await fetch(bitcoinBlockchainAPITransactionEndpoint);

    if (!response.ok)
      throw new Error(`Bitcoin Network Transaction Response was not OK: ${response.statusText}`);

    return await response.json();
  } catch (error) {
    throw new Error(`Error fetching Bitcoin Transaction: ${error}`);
  }
}

/**
 * Broadcasts the Transaction to the Bitcoin Network.
 *
 * @param transaction - The Transaction to broadcast.
 * @returns A Promise that resolves to the Response from the Broadcast Request.
 */
export async function broadcastTransaction(
  transaction: string,
  bitcoinBlockchainAPI: string
): Promise<string> {
  try {
    const response = await fetch(`${bitcoinBlockchainAPI}/tx`, {
      method: 'POST',
      body: transaction,
    });

    if (!response.ok) {
      throw new Error(`Error while broadcasting Bitcoin Transaction: ${await response.text()}`);
    }

    const transactionID = await response.text();

    return transactionID;
  } catch (error) {
    throw new Error(`Error broadcasting Transaction: ${error}`);
  }
}

export async function fetchBitcoinBlockchainBlockHeight(
  bitcoinBlockchainAPI: string
): Promise<number> {
  try {
    const bitcoinBlockchainBlockHeightURL = `${bitcoinBlockchainAPI}/blocks/tip/height`;

    const response = await fetch(bitcoinBlockchainBlockHeightURL);

    if (!response.ok)
      throw new Error(
        `Bitcoin Network Block Height Network Response was not OK: ${response.statusText}`
      );

    return await response.json();
  } catch (error) {
    throw new Error(`Error fetching Bitcoin Blockchain Block Height: ${error}`);
  }
}

export async function checkBitcoinTransactionConfirmations(
  bitcoinTransaction: BitcoinTransaction,
  bitcoinBlockHeight: number
): Promise<boolean> {
  try {
    if (!bitcoinTransaction.status.block_height) {
      throw new Error('Funding Transaction has no Block Height.');
    }

    const confirmations = bitcoinBlockHeight - (bitcoinTransaction.status.block_height + 1);
    if (confirmations >= 6) {
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(`Error checking Bitcoin Transaction Confirmations: ${error}`);
  }
}
