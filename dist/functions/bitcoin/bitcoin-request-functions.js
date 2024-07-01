/**
 * Fetches the Bitcoin Transaction from the Bitcoin Network.
 *
 * @param txID - The Transaction ID of the Bitcoin Transaction.
 * @param bitcoinBlockchainAPI - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Bitcoin Transaction.
 */
export async function fetchBitcoinTransaction(txID, bitcoinBlockchainAPI) {
    try {
        const bitcoinBlockchainAPITransactionEndpoint = `${bitcoinBlockchainAPI}/tx/${txID}`;
        const response = await fetch(bitcoinBlockchainAPITransactionEndpoint);
        if (!response.ok)
            throw new Error(`Bitcoin Network Transaction Response was not OK: ${response.statusText}`);
        return await response.json();
    }
    catch (error) {
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
export async function broadcastTransaction(transaction, bitcoinBlockchainAPI) {
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
    }
    catch (error) {
        throw new Error(`Error broadcasting Transaction: ${error}`);
    }
}
/**
 * Fetches the Current Block Height of the Bitcoin Network.
 *
 * @param bitcoinBlockchainAPI - The URL of the Bitcoin Blockchain API.
 * @returns A Promise that resolves to the Current Block Height of the Bitcoin Network.
 */
export async function fetchBitcoinBlockchainBlockHeight(bitcoinBlockchainAPI) {
    try {
        const bitcoinBlockchainBlockHeightURL = `${bitcoinBlockchainAPI}/blocks/tip/height`;
        const response = await fetch(bitcoinBlockchainBlockHeightURL);
        if (!response.ok)
            throw new Error(`Bitcoin Network Block Height Network Response was not OK: ${response.statusText}`);
        return await response.json();
    }
    catch (error) {
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
export async function checkBitcoinTransactionConfirmations(bitcoinTransaction, bitcoinBlockHeight) {
    try {
        if (!bitcoinTransaction.status.block_height) {
            throw new Error('Funding Transaction has no Block Height.');
        }
        const confirmations = bitcoinBlockHeight - (bitcoinTransaction.status.block_height + 1);
        if (confirmations >= 6) {
            return true;
        }
        return false;
    }
    catch (error) {
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
export async function getBalance(bitcoinAddress, bitcoinBlockchainAPIURL) {
    const utxoResponse = await fetch(`${bitcoinBlockchainAPIURL}/address/${bitcoinAddress}/utxo`);
    if (!utxoResponse.ok) {
        throw new Error(`Error getting UTXOs: ${utxoResponse.statusText}`);
    }
    const userUTXOs = await utxoResponse.json();
    const balanceInSats = userUTXOs.reduce((total, utxo) => total + utxo.value, 0);
    return balanceInSats;
}
