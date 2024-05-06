/** @format */

import { hexToBytes } from '@noble/hashes/utils';
import { hex } from '@scure/base';
import { selectUTXO } from '@scure/btc-signer';
import { P2TROut, p2tr, p2tr_ns, p2wpkh } from '@scure/btc-signer/payment';
import { taprootTweakPubkey } from '@scure/btc-signer/utils';

import { Network, Psbt } from 'bitcoinjs-lib';
import { getNativeSegwitMultisigScript } from './payment-functions.js';
import { bitcoinToSats } from './utilities.js';

interface TransactionStatus {
  confirmed: boolean;
  block_height: number;
  block_hash: string;
  block_time: number;
}

interface UTXO {
  txid: string;
  vout: number;
  status: TransactionStatus;
  value: number;
}

/**
 * Gets the UTXOs of the User's Native Segwit Address.
 *
 * @param bitcoinNativeSegwitAddress - The User's Native Segwit Address.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns A Promise that resolves to the UTXOs of the User's Native Segwit Address.
 */
export async function getUTXOs(
  bitcoinNativeSegwitAddress: string,
  publicKeys: string[],
  bitcoinNetwork: Network
): Promise<any> {
  const bitcoinBlockchainAPIURL = process.env.BITCOIN_BLOCKCHAIN_API_URL;

  try {
    const response = await fetch(`${bitcoinBlockchainAPIURL}/address/${bitcoinNativeSegwitAddress}/utxo`);

    if (!response.ok) {
      throw new Error(`Error getting UTXOs: ${response.statusText}`);
    }

    const allUTXOs = await response.json();

    const spend = getNativeSegwitMultisigScript(publicKeys, bitcoinNetwork);

    const utxos = await Promise.all(
      allUTXOs.map(async (utxo: UTXO) => {
        const txHex = await (await fetch(`${bitcoinBlockchainAPIURL}/tx/${utxo.txid}/hex`)).text();
        return {
          ...spend,
          txid: utxo.txid,
          index: utxo.vout,
          value: utxo.value,
          nonWitnessUtxo: hex.decode(txHex),
        };
      })
    );
    return utxos;
  } catch (error) {
    throw new Error(`Error getting UTXOs: ${error}`);
  }
}

/**
 * Creates a Multisig Transaction using the Public Key of the User's Taproot Address and the Attestor Group's Public Key.
 * The Funding Transaction is sent to the Multisig Address.
 *
 * @param userPublicKey - The Public Key of the User's Taproot Address.
 * @param attestorGroupPublicKey - The Attestor Group's Public Key.
 * @param vaultUUID - The UUID of the Vault.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns A promise that resolves to the Multisig Transaction.
 */
export function createMultisigTransaction(
  userPublicKey: Uint8Array,
  attestorGroupPublicKey: Uint8Array,
  internalPublicKey: Uint8Array,
  vaultUUID: string,
  bitcoinNetwork: Network
): P2TROut {
  const multisig = p2tr_ns(2, [userPublicKey, attestorGroupPublicKey]);

  // const TAPROOT_UNSPENDABLE_KEY_STR = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';
  // const TAPROOT_UNSPENDABLE_KEY = hexToBytes(TAPROOT_UNSPENDABLE_KEY_STR);

  // const tweakedUnspendableWithUUID = taprootTweakPubkey(TAPROOT_UNSPENDABLE_KEY, Buffer.from(vaultUUID))[0];
  const multisigTransaction = p2tr(internalPublicKey, multisig, bitcoinNetwork);
  multisigTransaction.tapInternalKey = internalPublicKey;

  return multisigTransaction;
}

/**
 * Creates a Funding Transaction to fund the Multisig Transaction.
 *
 * @param bitcoinAmount - The amount of Bitcoin to fund the Transaction with.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param multisigAddress - The Multisig Address.
 * @param utxos - The UTXOs to use for the Transaction.
 * @param userChangeAddress - The user's Change Address.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Funding Transaction.
 */
export async function createFundingTransaction(
  bitcoinAmount: number,
  bitcoinNetwork: Network,
  multisigAddress: string,
  nativeSegwitAddress: string,
  nativeSegwitPublicKeys: string[],
  feeRate: bigint,
  feePublicKey: string,
  feeBasisPoints: number
): Promise<Uint8Array> {
  const feePublicKeyBuffer = Buffer.from(feePublicKey, 'hex');
  const { address: feeAddress } = p2wpkh(feePublicKeyBuffer, bitcoinNetwork);

  if (!feeAddress) throw new Error('Could not create Fee Address');

  const utxos = await getUTXOs(nativeSegwitAddress, nativeSegwitPublicKeys, bitcoinNetwork);

  const outputs = [
    { address: multisigAddress, amount: BigInt(bitcoinToSats(bitcoinAmount)) },
    {
      address: feeAddress,
      amount: BigInt(bitcoinToSats(bitcoinAmount) * feeBasisPoints),
    },
  ];

  const selected = selectUTXO(utxos, outputs, 'default', {
    changeAddress: nativeSegwitAddress,
    feePerByte: feeRate,
    bip69: false,
    createTx: true,
    network: bitcoinNetwork,
  });

  const fundingTX = selected?.tx;

  if (!fundingTX) throw new Error('Could not create Funding Transaction');

  const fundingPSBT = fundingTX.toPSBT();

  return fundingPSBT;
}

export function getFeeRecipientAddress(feePublicKey: string, bitcoinNetwork: Network): string {
  const feePublicKeyBuffer = Buffer.from(feePublicKey, 'hex');
  const { address } = p2wpkh(feePublicKeyBuffer, bitcoinNetwork);
  if (!address) throw new Error('Could not create Fee Address');
  return address;
}

/**
 * Creates a Funding Transaction to fund the Multisig Transaction.
 *
 * @param bitcoinAmount - The amount of Bitcoin to fund the Transaction with.
 * @param multisigAddress - The Multisig Address.
 * @param feeRecipientAddress - The Fee Recipient's Address.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Funding Transaction Info.
 */
export function getFundingTransactionRecipients(
  bitcoinAmount: number,
  multisigAddress: string,
  feeRecipientAddress: string,
  feeBasisPoints: number
) {
  const recipients = [
    { amount: bitcoinToSats(bitcoinAmount), address: multisigAddress },
    {
      amount: bitcoinToSats(bitcoinAmount) * feeBasisPoints,
      address: feeRecipientAddress,
    },
  ];

  return recipients;
}

/**
 * Creates the Closing Transaction.
 * Uses the Funding Transaction's ID to create the Closing Transaction.
 * The Closing Transaction is sent to the User's Native Segwit Address.
 *
 * @param bitcoinAmount - The Amount of Bitcoin to fund the Transaction with.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param fundingTransactionID - The ID of the Funding Transaction.
 * @param multisigTransaction - The Multisig Transaction.
 * @param userNativeSegwitAddress - The User's Native Segwit Address.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Closing Transaction.
 */
export async function createClosingTransaction(
  bitcoinAmount: number,
  bitcoinNetwork: Network,
  fundingTransactionID: string,
  multisigTransaction: P2TROut,
  userNativeSegwitAddress: string,
  feeRate: bigint,
  feePublicKey: string,
  feeBasisPoints: number
): Promise<Uint8Array> {
  const feePublicKeyBuffer = Buffer.from(feePublicKey, 'hex');
  const { address: feeAddress } = p2wpkh(feePublicKeyBuffer, bitcoinNetwork);

  if (!feeAddress) throw new Error('Could not create Fee Address');

  const inputs = [
    {
      txid: hexToBytes(fundingTransactionID),
      index: 0,
      witnessUtxo: {
        amount: BigInt(bitcoinToSats(bitcoinAmount)),
        script: multisigTransaction.script,
      },
      ...multisigTransaction,
    },
  ];

  const outputs = [
    {
      address: feeAddress,
      amount: BigInt(bitcoinToSats(bitcoinAmount) * feeBasisPoints),
    },
  ];

  const selected = selectUTXO(inputs, outputs, 'default', {
    changeAddress: userNativeSegwitAddress,
    feePerByte: feeRate,
    bip69: false,
    createTx: true,
    network: bitcoinNetwork,
  });

  if (!selected?.tx) throw new Error('Could not create Closing Transaction');

  const closingPSBT = selected.tx.toPSBT();

  return closingPSBT;
}

/**
 * Broadcasts the Transaction to the Bitcoin Network.
 *
 * @param transaction - The Transaction to broadcast.
 * @returns A Promise that resolves to the Response from the Broadcast Request.
 */
export async function broadcastTransaction(transaction: string): Promise<string> {
  const bitcoinBlockchainAPIURL = process.env.BITCOIN_BLOCKCHAIN_API_URL;

  try {
    const response = await fetch(`${bitcoinBlockchainAPIURL}/tx`, {
      method: 'POST',
      body: transaction,
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${await response.text()}`);
    }

    const transactionID = await response.text();

    return transactionID;
  } catch (error) {
    throw new Error(`Error broadcasting Transaction: ${error}`);
  }
}
