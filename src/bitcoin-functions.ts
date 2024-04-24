/** @format */

import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { hex } from '@scure/base';
import { Transaction, selectUTXO } from '@scure/btc-signer';
import { P2TROut, p2ms, p2tr, p2tr_ns, p2wpkh, p2wsh } from '@scure/btc-signer/payment';
import { taprootTweakPubkey } from '@scure/btc-signer/utils';

import BIP32Factory from 'bip32';
import { Network, Payment, payments } from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { satsToBitcoin } from './utilities.js';
import { fromOutputScript, fromBech32 } from 'bitcoinjs-lib/src/address.js';
import { TARGET_CHILD_NODES, TARGET_NATIVE_SEGWIT_MULTISIG_PUBLICKEYS } from './index.js';

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

export function getAddress(publicKey: string, network: Network) {
  const publicKeyBuffer = Buffer.from(publicKey, 'hex');
  const { address } = p2wpkh(publicKeyBuffer, network);
  console.log('Address:', address);
  return p2wpkh(publicKeyBuffer, network).address;
}

export function derivePublicKeyFromMasterPublicKey(masterPublicKey: string, derivationPathRoot: string, index: string) {
  const bip32 = BIP32Factory.BIP32Factory(ecc);
  const derivationPath = `${derivationPathRoot}${index}`;
  const masterNode = bip32.fromBase58(masterPublicKey);
  const publicKey = masterNode.derivePath(derivationPath).publicKey;
  const publicKeyString = publicKey.toString('hex');
  if (TARGET_NATIVE_SEGWIT_MULTISIG_PUBLICKEYS.includes(publicKeyString)) {
    console.log(`Found Matching Public Key:, ${publicKeyString}, at Derivation Path: ${derivationPath}`);
  }
  return publicKey.toString('hex');
}

export function deriveChildNodeFromMasterPublicKey(masterPublicKey: string, id: number, network: Network) {
  const bip32 = BIP32Factory.BIP32Factory(ecc);
  const derivationPath = `m/0/0/20/${id}`;
  const masterNode = bip32.fromBase58(masterPublicKey);
  const childXPub = masterNode.derivePath(derivationPath).toBase58();
  console.log('Child Public Key:', childXPub);
  if (TARGET_CHILD_NODES.includes(childXPub)) {
    console.log(`Found Matching Public Key: ${childXPub}`);
  }
  return childXPub;
}

export function getInnerPublicKey(publicKey: string, id: number, network: Network) {
  const bip32 = BIP32Factory.BIP32Factory(ecc);
  const node = bip32.fromBase58(publicKey).publicKey.toString('hex');
  console.log('Public Key:', node);
  if (TARGET_NATIVE_SEGWIT_MULTISIG_PUBLICKEYS.includes(node)) {
    console.log(`Found Matching Public Key: ${node}`);
  }
  return node;
}

export function getTaprootAddress(publicKey: string, bitcoinNetwork: Network) {
  console.log('Public Key:', publicKey);
  const publicKeyBuffer = Buffer.from(publicKey, 'hex');
  const { address } = p2tr(publicKeyBuffer, undefined, bitcoinNetwork);
  console.log('Address:', address);
  return address;
}

export function getPublicKeyFromTaprootAddress(address: string, network: Network): Buffer {
  const { data } = fromBech32(address);
  return data;
}

// export function createP2WSHMultisigAddress(pubkeys: string[], network: Network): string {
//   const publicKeyBuffers = TARGET_NATIVE_SEGWIT_MULTISIG_PUBLICKEYS.map((hex) => Buffer.from(hex, 'hex'));
//   const redeemScript = p2ms(2, publicKeyBuffers).redeemScript;
//   if (!redeemScript) throw new Error('Could not create redeem script');
//   const scriptPubKey = p2wsh(redeemScript, network);
//   return fromOutputScript(scriptPubKey!, network);
// }
// export function createMultisigSpend(bitcoinNetwork: Network) {
//   const publicKeysBuffer = TARGET_NATIVE_SEGWIT_MULTISIG_PUBLICKEYS.map((hex) => Buffer.from(hex, 'hex'));
//   const redeemScript = p2ms(2, publicKeysBuffer);
//   const spendScript = p2wsh(redeemScript, bitcoinNetwork).address;
//   console.log('Spend Script:', spendScript);
// }

export function getMultisigNativeSegwitAddress(publicKeys: string[], bitcoinNetwork: Network) {
  const publicKeysBuffer = publicKeys.map((hex) => Buffer.from(hex, 'hex'));
  const redeemScript = p2ms(2, publicKeysBuffer);
  const multisigAddress = p2wsh(redeemScript, bitcoinNetwork).address;
  return multisigAddress;
}

// /**
//  * Gets the UTXOs of the User's Native Segwit Address.
//  *
//  * @param bitcoinNativeSegwitAddress - The User's Native Segwit Address.
//  * @param bitcoinNetwork - The Bitcoin Network to use.
//  * @returns A Promise that resolves to the UTXOs of the User's Native Segwit Address.
//  */
// export async function getUTXOs(
//   bitcoinNativeSegwitAddress: string,
//   publicKeys: string[],
//   bitcoinNetwork: Network
// ): Promise<any> {
//   const bitcoinBlockchainAPIURL = process.env.BITCOIN_BLOCKCHAIN_API_URL;

//   try {
//     const response = await fetch(`${bitcoinBlockchainAPIURL}/address/${bitcoinNativeSegwitAddress}/utxo`);

//     if (!response.ok) {
//       throw new Error(`Error getting UTXOs: ${response.statusText}`);
//     }

//     const allUTXOs = await response.json();

//     const spend = createMultisigSpend(publicKeys, bitcoinNetwork);

//     const utxos = await Promise.all(
//       allUTXOs.map(async (utxo: UTXO) => {
//         const txHex = await (await fetch(`${bitcoinBlockchainAPIURL}/tx/${utxo.txid}/hex`)).text();
//         return {
//           ...spend,
//           txid: utxo.txid,
//           index: utxo.vout,
//           value: utxo.value,
//           nonWitnessUtxo: hex.decode(txHex),
//         };
//       })
//     );
//     return utxos;
//   } catch (error) {
//     throw new Error(`Error getting UTXOs: ${error}`);
//   }
// }

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
function createMultisigTransaction(
  userPublicKey: Uint8Array,
  attestorGroupPublicKey: Uint8Array,
  vaultUUID: string,
  bitcoinNetwork: Network
): P2TROut {
  const multisig = p2tr_ns(2, [userPublicKey, attestorGroupPublicKey]);

  const TAPROOT_UNSPENDABLE_KEY_STR = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';
  const TAPROOT_UNSPENDABLE_KEY = hexToBytes(TAPROOT_UNSPENDABLE_KEY_STR);

  const tweakedUnspendableWithUUID = taprootTweakPubkey(TAPROOT_UNSPENDABLE_KEY, Buffer.from(vaultUUID))[0];
  const multisigTransaction = p2tr(tweakedUnspendableWithUUID, multisig, bitcoinNetwork);
  multisigTransaction.tapInternalKey = tweakedUnspendableWithUUID;

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
function createFundingTransaction(
  bitcoinAmount: number,
  bitcoinNetwork: Network,
  multisigAddress: string,
  utxos: any[],
  userChangeAddress: string,
  feeRate: bigint,
  feePublicKey: string,
  feeBasisPoints: number
): Transaction {
  const feePublicKeyBuffer = Buffer.from(feePublicKey, 'hex');
  const { address: feeAddress } = p2wpkh(feePublicKeyBuffer, bitcoinNetwork);

  if (!feeAddress) throw new Error('Could not create Fee Address');

  const outputs = [
    { address: multisigAddress, amount: BigInt(satsToBitcoin(bitcoinAmount)) },
    {
      address: feeAddress,
      amount: BigInt(satsToBitcoin(bitcoinAmount) * feeBasisPoints),
    },
  ];

  const selected = selectUTXO(utxos, outputs, 'default', {
    changeAddress: userChangeAddress,
    feePerByte: feeRate,
    bip69: false,
    createTx: true,
    network: bitcoinNetwork,
  });

  const fundingTX = selected?.tx;

  if (!fundingTX) throw new Error('Could not create Funding Transaction');

  return fundingTX;
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
async function createClosingTransaction(
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
        amount: BigInt(satsToBitcoin(bitcoinAmount)),
        script: multisigTransaction.script,
      },
      ...multisigTransaction,
    },
  ];

  const outputs = [
    {
      address: feeAddress,
      amount: BigInt(satsToBitcoin(bitcoinAmount) * feeBasisPoints),
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
async function broadcastTransaction(transaction: Transaction): Promise<string> {
  const bitcoinBlockchainAPIURL = process.env.BITCOIN_BLOCKCHAIN_API_URL;

  try {
    const response = await fetch(`${bitcoinBlockchainAPIURL}/tx`, {
      method: 'POST',
      body: bytesToHex(transaction.extract()),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const transactionID = await response.text();

    return transactionID;
  } catch (error) {
    throw new Error(`Error broadcasting Transaction: ${error}`);
  }
}
