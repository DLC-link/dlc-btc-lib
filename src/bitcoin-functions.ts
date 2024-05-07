/** @format */

import { hexToBytes } from '@noble/hashes/utils';
import { hex } from '@scure/base';
import { Transaction, selectUTXO } from '@scure/btc-signer';
import { Address, OutScript, P2Ret, P2TROut, p2ms, p2pk, p2tr, p2tr_ns, p2wpkh } from '@scure/btc-signer/payment';
import { taprootTweakPubkey } from '@scure/btc-signer/utils';

import { Network, Psbt } from 'bitcoinjs-lib';
import { getNativeSegwitMultisigScript } from './payment-functions.js';
import { bitcoinToSats } from './utilities.js';
import { TransactionInput } from '@scure/btc-signer/psbt';
import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';
import AppClient, { DefaultWalletPolicy } from 'ledger-bitcoin';

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

export interface BitcoinInputSigningConfig {
  derivationPath: string;
  index: number;
}

export type PaymentTypes = 'p2pkh' | 'p2sh' | 'p2wpkh-p2sh' | 'p2wpkh' | 'p2tr';

/**
 * This class represents a partial signature produced by the app during signing.
 * It always contains the `signature` and the corresponding `pubkey` whose private key
 * was used for signing; in the case of taproot script paths, it also contains the
 * tapleaf hash.
 */
export declare class PartialSignature {
  readonly pubkey: Buffer;
  readonly signature: Buffer;
  readonly tapleafHash?: Buffer;
  constructor(pubkey: Buffer, signature: Buffer, tapleafHash?: Buffer);
}

const TAPROOT_UNSPENDABLE_KEY_HEX = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';

/**
 * Gets the UTXOs of the User's Native Segwit Address.
 *
 * @param bitcoinNativeSegwitTransaction -
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns A Promise that resolves to the UTXOs of the User's Native Segwit Address.
 */
export async function getUTXOs(bitcoinNativeSegwitTransaction: P2Ret, bitcoinNetwork: Network): Promise<any> {
  const bitcoinBlockchainAPIURL = process.env.BITCOIN_BLOCKCHAIN_API_URL;

  const utxoResponse = await fetch(`${bitcoinBlockchainAPIURL}/address/${bitcoinNativeSegwitTransaction.address}/utxo`);

  if (!utxoResponse.ok) {
    throw new Error(`Error getting UTXOs: ${utxoResponse.statusText}`);
  }

  const userUTXOs = await utxoResponse.json();

  const modifiedUTXOs = await Promise.all(
    userUTXOs.map(async (utxo: UTXO) => {
      return {
        ...bitcoinNativeSegwitTransaction,
        txid: utxo.txid,
        index: utxo.vout,
        value: utxo.value,
        witnessUtxo: {
          script: bitcoinNativeSegwitTransaction.script,
          amount: BigInt(utxo.value),
        },
        redeemScript: bitcoinNativeSegwitTransaction.redeemScript,
      };
    })
  );
  return modifiedUTXOs;
}

function getFeeRecipientAddressFromPublicKey(feePublicKey: string, bitcoinNetwork: Network): string {
  const feePublicKeyBuffer = Buffer.from(feePublicKey, 'hex');
  const { address } = p2wpkh(feePublicKeyBuffer, bitcoinNetwork);
  if (!address) throw new Error('Could not create Fee Address');
  return address;
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
  vaultUUID: string,
  bitcoinNetwork: Network,
  unspendablePublicKey?: Uint8Array
): P2TROut {
  const multisig = p2tr_ns(2, [userPublicKey, attestorGroupPublicKey]);

  if (unspendablePublicKey) {
    const multisigTransaction = p2tr(unspendablePublicKey, multisig, bitcoinNetwork);
    multisigTransaction.tapInternalKey = unspendablePublicKey;
    return multisigTransaction;
  }

  const unspendablePublicKeyBytes = hexToBytes(TAPROOT_UNSPENDABLE_KEY_HEX);

  const tweakedUnspendableWithUUID = taprootTweakPubkey(unspendablePublicKeyBytes, Buffer.from(vaultUUID))[0];
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
 * @param bitcoinNativeSegwitTransaction - The user's Native Segwit Transaction.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Funding Transaction.
 */
export async function createFundingTransaction(
  bitcoinAmount: number,
  bitcoinNetwork: Network,
  multisigAddress: string,
  bitcoinNativeSegwitTransaction: P2Ret,
  feeRate: bigint,
  feePublicKey: string,
  feeBasisPoints: number
): Promise<Uint8Array> {
  const feeAddress = getFeeRecipientAddressFromPublicKey(feePublicKey, bitcoinNetwork);
  const feeRecipientOutputValue = BigInt(bitcoinToSats(bitcoinAmount) * feeBasisPoints);

  const outputValue = BigInt(bitcoinToSats(bitcoinAmount));

  const userUTXOs = await getUTXOs(bitcoinNativeSegwitTransaction, bitcoinNetwork);

  const psbtOutputs = [
    { address: multisigAddress, amount: outputValue },
    {
      address: feeAddress,
      amount: feeRecipientOutputValue,
    },
  ];

  const selected = selectUTXO(userUTXOs, psbtOutputs, 'default', {
    changeAddress: bitcoinNativeSegwitTransaction.address!,
    feePerByte: feeRate,
    bip69: false,
    createTx: true,
    network: bitcoinNetwork,
  });

  const fundingTX = selected?.tx;

  console.log('Funding Transaction:', fundingTX);
  if (!fundingTX) throw new Error('Could not create Funding Transaction');

  const fundingPSBT = fundingTX.toPSBT(0);

  return fundingPSBT;
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

export function getInputPaymentType(index: number, input: TransactionInput, bitcoinNetwork: Network): PaymentTypes {
  const bitcoinAddress = getBitcoinInputAddress(index, input, bitcoinNetwork);

  if (bitcoinAddress === '') throw new Error('Bitcoin Address is empty');
  if (bitcoinAddress.startsWith('bc1p') || bitcoinAddress.startsWith('tb1p') || bitcoinAddress.startsWith('bcrt1p'))
    return 'p2tr';
  if (bitcoinAddress.startsWith('bc1q') || bitcoinAddress.startsWith('tb1q') || bitcoinAddress.startsWith('bcrt1q'))
    return 'p2wpkh';
  throw new Error('Unable to infer payment type from BitcoinAddress');
}

export function getBitcoinInputAddress(index: number, input: TransactionInput, bitcoinNetwork: Network) {
  if (isDefined(input.witnessUtxo)) return getAddressFromOutScript(input.witnessUtxo.script, bitcoinNetwork);
  if (isDefined(input.nonWitnessUtxo))
    return getAddressFromOutScript(input.nonWitnessUtxo.outputs[index]?.script, bitcoinNetwork);
  return '';
}

export function createRangeFromLength(length: number) {
  return [...Array(length).keys()];
}

export function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}

export function isDefined<T>(argument: T | undefined): argument is T {
  return !isUndefined(argument);
}

export function getAddressFromOutScript(script: Uint8Array, bitcoinNetwork: Network) {
  const outputScript = OutScript.decode(script);

  switch (outputScript.type) {
    case 'pkh':
    case 'sh':
    case 'wpkh':
    case 'wsh':
      return Address(bitcoinNetwork).encode({
        type: outputScript.type,
        hash: outputScript.hash,
      });
    case 'tr':
      return Address(bitcoinNetwork).encode({
        type: outputScript.type,
        pubkey: outputScript.pubkey,
      });
    case 'ms':
      return p2ms(outputScript.m, outputScript.pubkeys).address ?? '';
    case 'pk':
      return p2pk(outputScript.pubkey, bitcoinNetwork).address ?? '';
    case 'tr_ms':
    case 'tr_ns':
      throw new Error('Unsupported Script Type');
    case 'unknown':
      throw new Error('Unknown Script Type');
    default:
      throw new Error('Unsupported Script Type');
  }
}

export function createBitcoinInputSigningConfiguration(
  psbt: Uint8Array,
  bitcoinNetwork: Network
): BitcoinInputSigningConfig[] {
  let nativeSegwitDerivationPath = '';
  let taprootDerivationPath = '';

  switch (bitcoinNetwork) {
    case bitcoin:
      nativeSegwitDerivationPath = "m/84'/0'/0'/0/0";
      taprootDerivationPath = "m/86'/0'/0'/0/0";
      break;
    case testnet:
      nativeSegwitDerivationPath = "m/84'/1'/0'/0/0";
      taprootDerivationPath = "m/86'/1'/0'/0/0";
      break;
    default:
      throw new Error('Unsupported Bitcoin Network');
  }

  const transaction = Transaction.fromPSBT(psbt);
  const indexesToSign = createRangeFromLength(transaction.inputsLength);
  return indexesToSign.map((inputIndex) => {
    const input = transaction.getInput(inputIndex);

    if (isUndefined(input.index)) throw new Error('Input must have an index for payment type');
    const paymentType = getInputPaymentType(input.index, input, bitcoinNetwork);

    switch (paymentType) {
      case 'p2wpkh':
        return {
          index: inputIndex,
          derivationPath: nativeSegwitDerivationPath,
        };
      case 'p2tr':
        return {
          index: inputIndex,
          derivationPath: taprootDerivationPath,
        };
      default:
        throw new Error('Unsupported Payment Type');
    }
  });
}

export function getInputByPaymentTypeArray(
  signingConfiguration: BitcoinInputSigningConfig[],
  psbt: Buffer,
  bitcoinNetwork: Network
) {
  const transaction = Transaction.fromPSBT(psbt);

  return signingConfiguration.map((config) => {
    const inputIndex = transaction.getInput(config.index).index;
    if (isUndefined(inputIndex)) throw new Error('Input must have an index for payment type');
    return [config, getInputPaymentType(inputIndex, transaction.getInput(config.index), bitcoinNetwork)];
  }) as [BitcoinInputSigningConfig, PaymentTypes][];
}

export async function updateNativeSegwitInputs(
  inputByPaymentType: [BitcoinInputSigningConfig, PaymentTypes][],
  nativeSegwitPublicKey: Buffer,
  masterFingerprint: string,
  psbt: Psbt
) {
  const nativeSegwitInputsToSign = inputByPaymentType
    .filter(([_, paymentType]) => paymentType === 'p2wpkh')
    .map(([index]) => index);

  if (nativeSegwitInputsToSign.length) {
    try {
      await addNativeSegwitUTXOLedgerProps(psbt, nativeSegwitInputsToSign);
    } catch (e) {}

    await addNativeSegwitBip32Derivation(psbt, masterFingerprint, nativeSegwitPublicKey, nativeSegwitInputsToSign);

    return psbt;
  }
}

export async function updateTaprootInputs(
  inputsToUpdate: BitcoinInputSigningConfig[] = [],
  taprootPublicKey: Buffer,
  masterFingerprint: string,
  psbt: Psbt
): Promise<Psbt> {
  inputsToUpdate.forEach(({ index, derivationPath }) => {
    psbt.updateInput(index, {
      tapBip32Derivation: [
        {
          masterFingerprint: Buffer.from(masterFingerprint, 'hex'),
          pubkey: ecdsaPublicKeyToSchnorr(taprootPublicKey),
          path: derivationPath,
          leafHashes: [],
        },
      ],
    });
  });

  return psbt;
}

export async function addNativeSegwitUTXOLedgerProps(
  psbt: Psbt,
  inputSigningConfiguration: BitcoinInputSigningConfig[]
): Promise<Psbt> {
  const bitcoinBlockchainAPIURL = process.env.BITCOIN_BLOCKCHAIN_API_URL;

  const inputTransactionHexes = await Promise.all(
    psbt.txInputs.map(async (input) =>
      (await fetch(`${bitcoinBlockchainAPIURL}/tx/${reverseBytes(input.hash).toString('hex')}/hex`)).text()
    )
  );

  inputSigningConfiguration.forEach(({ index }) => {
    psbt.updateInput(index, {
      nonWitnessUtxo: Buffer.from(inputTransactionHexes[index], 'hex'),
    });
  });

  return psbt;
}

export async function addNativeSegwitBip32Derivation(
  psbt: Psbt,
  masterFingerPrint: string,
  nativeSegwitPublicKey: Buffer,
  inputSigningConfiguration: BitcoinInputSigningConfig[]
): Promise<Psbt> {
  inputSigningConfiguration.forEach(({ index, derivationPath }) => {
    psbt.updateInput(index, {
      bip32Derivation: [
        {
          masterFingerprint: Buffer.from(masterFingerPrint, 'hex'),
          pubkey: nativeSegwitPublicKey,
          path: derivationPath,
        },
      ],
    });
  });

  return psbt;
}

export function addNativeSegwitSignaturesToPSBT(psbt: Psbt, signatures: [number, PartialSignature][]) {
  signatures.forEach(([index, signature]) => psbt.updateInput(index, { partialSig: [signature] }));
}

export function addTaprootInputSignaturesToPSBT(psbt: Psbt, signatures: [number, PartialSignature][]) {
  signatures.forEach(([index, signature]) => psbt.updateInput(index, { tapKeySig: signature.signature }));
}

const ecdsaPublicKeyLength = 33;

export function ecdsaPublicKeyToSchnorr(publicKey: Buffer) {
  if (publicKey.byteLength !== ecdsaPublicKeyLength) throw new Error('Invalid Public Key Length');
  return publicKey.subarray(1);
}

export function reverseBytes(bytes: Buffer): Buffer;
export function reverseBytes(bytes: Uint8Array): Uint8Array;
export function reverseBytes(bytes: Buffer | Uint8Array) {
  if (Buffer.isBuffer(bytes)) return Buffer.from(bytes).reverse();
  return new Uint8Array(bytes.slice().reverse());
}
