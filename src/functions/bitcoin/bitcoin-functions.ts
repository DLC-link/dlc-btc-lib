import * as ellipticCurveCryptography from '@bitcoinerlab/secp256k1';
import { hexToBytes } from '@noble/hashes/utils';
import {
  Address,
  OutScript,
  Transaction,
  p2ms,
  p2pk,
  p2tr,
  p2tr_ns,
  p2wpkh,
} from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { TransactionInput } from '@scure/btc-signer/psbt';
import { BIP32Factory, BIP32Interface } from 'bip32';
import { FetchedRawTransaction, TxOut } from 'bitcoin-core';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import { Decimal } from 'decimal.js';
import * as R from 'ramda';

import { BitcoinInputSigningConfig, PaymentTypes } from '../../models/bitcoin-models.js';
import {
  compareUint8Arrays,
  createRangeFromLength,
  isDefined,
  isUndefined,
} from '../../utilities/index.js';
import { BitcoinCoreRpcConnection } from './bitcoincore-rpc-connection.js';

const TAPROOT_UNSPENDABLE_KEY_HEX =
  '0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';
const ECDSA_PUBLIC_KEY_LENGTH = 33;

const bip32 = BIP32Factory(ellipticCurveCryptography);

export function getFeeAmount(bitcoinAmount: number, feeBasisPoints: number): number {
  const feePercentage = new Decimal(feeBasisPoints).dividedBy(100);
  return new Decimal(bitcoinAmount).times(feePercentage.dividedBy(100)).toNumber();
}

/**
 * Derives the Public Key at the Unhardened Path (0/0) from a given Extended Public Key.
 * @param extendedPublicKey - The base58-encoded Extended Public Key.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Public Key derived at the Unhardened Path.
 */
export function deriveUnhardenedPublicKey(
  extendedPublicKey: string,
  bitcoinNetwork: Network,
  addressIndex: number = 0
): Buffer {
  return bip32.fromBase58(extendedPublicKey, bitcoinNetwork).derivePath(`0/${addressIndex}`)
    .publicKey;
}

/**
 * Derives the Account Key Pair from the Root Private Key.
 * @param rootPrivateKey - The Root Private Key.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param paymentType - The Payment Type to use.
 * @param accountIndex - The Account Index to use.
 * @returns The Account Key Pair.
 */
export function deriveUnhardenedKeyPairFromRootPrivateKey(
  rootPrivateKey: string,
  bitcoinNetwork: Network,
  paymentType: 'p2tr' | 'p2wpkh',
  accountIndex: number
): BIP32Interface {
  switch (bitcoinNetwork) {
    case bitcoin:
      switch (paymentType) {
        case 'p2wpkh':
          return bip32
            .fromBase58(rootPrivateKey, bitcoinNetwork)
            .derivePath(`m/84'/0'/${accountIndex}'/0/0`);
        case 'p2tr':
          return bip32
            .fromBase58(rootPrivateKey, bitcoinNetwork)
            .derivePath(`m/86'/0'/${accountIndex}'/0/0`);
        default:
          throw new Error('Unsupported Payment Type');
      }
    case testnet:
    case regtest:
      switch (paymentType) {
        case 'p2wpkh':
          return bip32
            .fromBase58(rootPrivateKey, bitcoinNetwork)
            .derivePath(`m/84'/1'/${accountIndex}'/0/0`);
        case 'p2tr':
          return bip32
            .fromBase58(rootPrivateKey, bitcoinNetwork)
            .derivePath(`m/86'/1'/${accountIndex}'/0/0`);
        default:
          throw new Error('Unsupported Payment Type');
      }
    default:
      throw new Error('Unsupported Bitcoin Network');
  }
}

export function getXOnlyPublicKey(publicKey: Buffer): Buffer {
  return publicKey.length === 32 ? publicKey : publicKey.subarray(1);
}

/**
 * Creates a Taproot Multisig Payment.
 * @param unspendableDerivedPublicKey - The Unspendable Derived Public Key.
 * @param attestorDerivedPublicKey - The Attestor Derived Public Key.
 * @param userDerivedPublicKey - The User Derived Public Key.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Taproot Multisig Payment.
 */
export function createTaprootMultisigPayment(
  unspendableDerivedPublicKey: Buffer,
  publicKeyA: Buffer,
  publicKeyB: Buffer,
  bitcoinNetwork: Network
): P2TROut {
  const unspendableDerivedPublicKeyFormatted = getXOnlyPublicKey(unspendableDerivedPublicKey);

  const publicKeys = [getXOnlyPublicKey(publicKeyA), getXOnlyPublicKey(publicKeyB)];
  const sortedArray = publicKeys.sort((a, b) => (a.toString('hex') > b.toString('hex') ? 1 : -1));

  const taprootMultiLeafWallet = p2tr_ns(2, sortedArray);

  return p2tr(unspendableDerivedPublicKeyFormatted, taprootMultiLeafWallet, bitcoinNetwork);
}

/**
 * Evaluates the fee rate from the bitcoin blockchain API.
 *
 * @returns The fee rate.
 */
function checkFeeRate(bitcoinNetwork: Network, feeRate: number | undefined): number | undefined {
  console.log('Checking Fee Rate: ', feeRate);
  if (!feeRate || R.isEmpty(feeRate) || feeRate < 2) {
    if (bitcoinNetwork === regtest) {
      return 2;
    }
  }
  return feeRate;
}

/**
 * Fetches the fee rate from the bitcoin blockchain API.
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @param feeRateMultiplier - The multiplier to apply to the fee rate.
 * @returns A promise that resolves to the hour fee rate.
 */
export async function getFeeRate(
  bitcoinNetwork: Network,
  bitcoincoreRpcConnection: BitcoinCoreRpcConnection,
  bitcoinBlockchainFeeRecommendationAPI: string,
  feeRateMultiplier?: number
): Promise<number> {
  console.log('GETTING FEE RATES');
  const client = bitcoincoreRpcConnection.getClient();
  console.log('GETTING FEE RATES - got bitcoin RPC client');
  try {
    console.log('Fetching fee estimate using the Bitcoin RPC client: ', client);
    const response = await client.estimateSmartFee(1);
    let feeData = response.feeRate;

    if (response.errors) {
      console.log('Error fetching fee estimate from Bitcoincore RPC: ', response.errors);
      console.log(
        'Fetching fee estimate from fee recommendation API: ',
        bitcoinBlockchainFeeRecommendationAPI
      );
      const apiResponse = await fetch(bitcoinBlockchainFeeRecommendationAPI);
      feeData = await apiResponse.json();
      console.log('Fee estimate from fee recommendation API: ', feeData);
    }

    const feeRate = checkFeeRate(bitcoinNetwork, feeData);
    if (!feeRate) throw new Error('Fee Rate is not defined');
    console.log('Checked Fee Rate: ', feeRate);
    console.log('feeRateMultiplier: ', feeRateMultiplier);
    return (
      feeRate *
      (feeRateMultiplier !== undefined && !Number.isNaN(feeRateMultiplier) ? feeRateMultiplier : 1)
    );
  } catch (error) {
    console.error('Error getting Bitcoin Blockchain Fee Rate Response:', error);
    throw new Error('Error getting Bitcoin Blockchain Fee Rate Response');
  }
}

/**
 * Gets the Fee Recipient's Address from the Rcipient's Public Key.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Fee Recipient's Address.
 */
export function getFeeRecipientAddressFromPublicKey(
  feePublicKey: string,
  bitcoinNetwork: Network
): string {
  const feePublicKeyBuffer = Buffer.from(feePublicKey, 'hex');
  console.log('INSIDE getFeeRecipientAddressFromPublicKey - feePublicKey: ', feePublicKey);
  console.log(
    'INSIDE getFeeRecipientAddressFromPublicKey - feePublicKeyBuffer: ',
    feePublicKeyBuffer
  );
  const { address } = p2wpkh(feePublicKeyBuffer, bitcoinNetwork);
  if (!address) throw new Error('Could not create Fee Address from Public Key');
  return address;
}

/**
 * Creates an Unspendable Key Committed to the Vault UUID.
 * @param vaultUUID - The UUID of the Vault.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Unspendable Key Committed to the Vault UUID.
 */
export function getUnspendableKeyCommittedToUUID(
  vaultUUID: string,
  bitcoinNetwork: Network
): string {
  const publicKeyBuffer = Buffer.from(TAPROOT_UNSPENDABLE_KEY_HEX, 'hex');
  const chainCodeBuffer = Buffer.from(vaultUUID.slice(2), 'hex');

  const unspendablePublicKey = bip32
    .fromPublicKey(publicKeyBuffer, chainCodeBuffer, bitcoinNetwork)
    .toBase58();

  return unspendablePublicKey;
}

/**
 * Returns the Payment Type of the Input.
 * @param index - A number that refers to the position of the output that will be utilized as an input.
 * @param input - The Input.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 */
function getInputPaymentType(
  index: number,
  input: TransactionInput,
  bitcoinNetwork: Network
): PaymentTypes {
  const bitcoinAddress = getBitcoinInputAddress(index, input, bitcoinNetwork);

  if (bitcoinAddress === '') throw new Error('Bitcoin Address is empty');
  if (
    bitcoinAddress.startsWith('bc1p') ||
    bitcoinAddress.startsWith('tb1p') ||
    bitcoinAddress.startsWith('bcrt1p')
  )
    return 'p2tr';
  if (
    bitcoinAddress.startsWith('bc1q') ||
    bitcoinAddress.startsWith('tb1q') ||
    bitcoinAddress.startsWith('bcrt1q')
  )
    return 'p2wpkh';
  throw new Error('Unable to infer payment type from BitcoinAddress');
}

/**
 * Returns the Bitcoin Address of the Input.
 * @param index - A number that refers to the position of the output that will be utilized as an input.
 * @param input - The Input.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 */
function getBitcoinInputAddress(
  index: number,
  input: TransactionInput,
  bitcoinNetwork: Network
): string {
  if (isDefined(input.witnessUtxo))
    return getAddressFromOutScript(input.witnessUtxo.script, bitcoinNetwork);
  if (isDefined(input.nonWitnessUtxo))
    return getAddressFromOutScript(input.nonWitnessUtxo.outputs[index]?.script, bitcoinNetwork);
  return '';
}

/**
 * Returns the Bitcoin Address from the Output Script.
 * @param script - The Output Script.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 */
function getAddressFromOutScript(script: Uint8Array, bitcoinNetwork: Network): string {
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

/**
 * Creates the Bitcoin Input Signing Configuration.
 * @param psbt - The PSBT from which to create the Configuration.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Bitcoin Input Signing Configuration.
 */
export function createBitcoinInputSigningConfiguration(
  transaction: Transaction,
  walletAccountIndex: number,
  walletAddressIndex: number,
  multisigPayment: P2TROut,
  bitcoinNetwork: Network,
  bitcoinNetworkIndex: number
): BitcoinInputSigningConfig[] {
  const nativeSegwitDerivationPath = `m/84'/${bitcoinNetworkIndex}'/${walletAccountIndex}'/0/${walletAddressIndex}`;
  const taprootDerivationPath = `m/86'/${bitcoinNetworkIndex}'/${walletAccountIndex}'/0/${walletAddressIndex}`;
  const multisigDerivationPath = `m/86'/${bitcoinNetworkIndex}'/${walletAccountIndex}'/0/0`;

  const multisigPaymentScript = multisigPayment.script;

  return createRangeFromLength(transaction.inputsLength).map(inputIndex => {
    const input = transaction.getInput(inputIndex);

    if (isUndefined(input.index)) throw new Error('Input must have an index for payment type');

    const paymentType = getInputPaymentType(input.index, input, bitcoinNetwork);

    const witnessUTXOScript = input.witnessUtxo?.script;

    if (isUndefined(witnessUTXOScript)) throw new Error('Witness UTXO Script is undefined');

    switch (paymentType) {
      case 'p2wpkh':
        return {
          index: inputIndex,
          derivationPath: nativeSegwitDerivationPath,
          isMultisigInput: false,
        };
      case 'p2tr':
        if (compareUint8Arrays(witnessUTXOScript, multisigPaymentScript)) {
          return {
            index: inputIndex,
            derivationPath: multisigDerivationPath,
            isMultisigInput: true,
          };
        } else {
          return {
            index: inputIndex,
            derivationPath: taprootDerivationPath,
            isMultisigInput: false,
          };
        }
      default:
        throw new Error('Unsupported Payment Type');
    }
  });
}

/**
 * Returns the Bitcoin Input Signing Configuration and Payment Type Array for the given PSBT.
 * @param signingConfiguration - The Bitcoin Input Signing Configuration.
 * @param psbt - The PSBT.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 */
export function getInputByPaymentTypeArray(
  signingConfiguration: BitcoinInputSigningConfig[],
  psbt: Buffer,
  bitcoinNetwork: Network
): [BitcoinInputSigningConfig, PaymentTypes][] {
  const transaction = Transaction.fromPSBT(psbt);

  return signingConfiguration.map(config => {
    const inputIndex = transaction.getInput(config.index).index;
    if (isUndefined(inputIndex)) throw new Error('Input must have an index for payment type');
    return [
      config,
      getInputPaymentType(inputIndex, transaction.getInput(config.index), bitcoinNetwork),
    ];
  });
}

export function getScriptMatchingOutputFromTransaction(
  bitcoinTransaction: FetchedRawTransaction,
  script: Uint8Array
): TxOut[] | undefined {
  return bitcoinTransaction.vout.filter(output =>
    validateScript(script, hexToBytes(output.scriptPubKey.hex))
  );
}

export function validateScript(script: Uint8Array, outputScript: Uint8Array): boolean {
  return (
    outputScript.length === script.length &&
    outputScript.every((value, index) => value === script[index])
  );
}

export function getInputIndicesByScript(script: Uint8Array, transaction: Transaction): number[] {
  return createRangeFromLength(transaction.inputsLength).flatMap(index => {
    const inputScript = transaction.getInput(index).witnessUtxo?.script;
    return inputScript && compareUint8Arrays(inputScript, script) ? [index] : [];
  });
}

export function finalizeUserInputs(transaction: Transaction, script: Uint8Array): void {
  console.log('Finalizing User Inputs - transaction: ', transaction);
  createRangeFromLength(transaction.inputsLength).forEach(index => {
    const inputScript = transaction.getInput(index).witnessUtxo?.script;
    console.log('Finalizing User Inputs - inputScript: ', inputScript);
    if (inputScript && compareUint8Arrays(inputScript, script)) {
      console.log('Finalizing User Inputs - inside the "IF"');
      transaction.finalizeIdx(index);
    }
  });
}

/**
 * Converts an ECDSA Public Key to a Schnorr Public Key.
 * @param publicKey - The ECDSA Public Key.
 */
export function ecdsaPublicKeyToSchnorr(publicKey: Buffer): Buffer {
  if (publicKey.byteLength !== ECDSA_PUBLIC_KEY_LENGTH)
    throw new Error('Invalid Public Key Length');
  return publicKey.subarray(1);
}

export function getBitcoinAddressFromExtendedPublicKey(
  bitcoinExtendedPublicKey: string,
  bitcoinNetwork: Network,
  bitcoinAddressIndex: number,
  paymentType: 'wpkh' | 'tr'
): string {
  const derivedPublicKey = deriveUnhardenedPublicKey(
    bitcoinExtendedPublicKey,
    bitcoinNetwork,
    bitcoinAddressIndex
  );

  const bitcoinAddress =
    paymentType === 'wpkh'
      ? p2wpkh(derivedPublicKey, bitcoinNetwork).address
      : p2tr(ecdsaPublicKeyToSchnorr(derivedPublicKey), undefined, bitcoinNetwork).address;

  if (!bitcoinAddress) throw new Error('Could not create Bitcoin Address');

  return bitcoinAddress;
}

export function getBitcoinAddressAndDerivedPKFromExtendedPublicKey(
  bitcoinExtendedPublicKey: string,
  bitcoinNetwork: Network,
  bitcoinAddressIndex: number,
  paymentType: 'wpkh' | 'tr'
): [string, Buffer] {
  const derivedPublicKey = deriveUnhardenedPublicKey(
    bitcoinExtendedPublicKey,
    bitcoinNetwork,
    bitcoinAddressIndex
  );

  const bitcoinAddress =
    paymentType === 'wpkh'
      ? p2wpkh(derivedPublicKey, bitcoinNetwork).address
      : p2tr(ecdsaPublicKeyToSchnorr(derivedPublicKey), undefined, bitcoinNetwork).address;

  if (!bitcoinAddress) throw new Error('Could not create Bitcoin Address');

  // let's return the address and the derived public key
  return [bitcoinAddress, derivedPublicKey];
}
