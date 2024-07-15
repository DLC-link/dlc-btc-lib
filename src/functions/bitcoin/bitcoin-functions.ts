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
import { Network } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import { Decimal } from 'decimal.js';
import * as ellipticCurveCryptography from 'tiny-secp256k1';

import {
  BitcoinInputSigningConfig,
  BitcoinTransaction,
  BitcoinTransactionVectorOutput,
  FeeRates,
  PaymentTypes,
  UTXO,
} from '../../models/bitcoin-models.js';
import {
  compareUint8Arrays,
  createRangeFromLength,
  isDefined,
  isUndefined,
} from '../../utilities/index.js';

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

export function getPublicKeyFromExtendedPublicKey(
  extendedPublicKey: string,
  bitcoinNetwork: Network
): Buffer {
  return bip32.fromBase58(extendedPublicKey, bitcoinNetwork).publicKey;
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
function checkFeeRate(feeRate: number | undefined): number {
  if (!feeRate || feeRate < 2) {
    return 2;
  }
  return feeRate;
}

/**
 * Fetches the fee rate from the bitcoin blockchain API.
 *
 * @returns A promise that resolves to the hour fee rate.
 */
export async function getFeeRate(
  bitcoinBlockchainAPIFeeURL: string,
  feeRateMultiplier?: number
): Promise<number> {
  const response = await fetch(bitcoinBlockchainAPIFeeURL);

  if (!response.ok) {
    throw new Error(`Bitcoin Blockchain Fee Rate Response was not OK: ${response.statusText}`);
  }

  let feeRates: FeeRates;

  try {
    feeRates = await response.json();
  } catch (error) {
    throw new Error(`Error parsing Bitcoin Blockchain Fee Rate Response JSON: ${error}`);
  }

  const feeRate = checkFeeRate(feeRates.fastestFee);
  const multipliedFeeRate = feeRate * (feeRateMultiplier ?? 1);

  return multipliedFeeRate;
}

/**
 * Gets the UTXOs of a given Bitcoin Payment object's Address.
 *
 * @param payment - The Payment object to get the Balance of.
 * @param bitcoinBlockchainAPIURL - The Bitcoin Blockchain URL used to fetch the  User's UTXOs.
 */
export async function getUTXOs(
  payment: P2Ret | P2TROut,
  bitcoinBlockchainAPIURL: string
): Promise<any> {
  const utxoEndpoint = `${bitcoinBlockchainAPIURL}/address/${payment.address}/utxo`;
  const utxoResponse = await fetch(utxoEndpoint);

  if (!utxoResponse.ok) {
    throw new Error(`Error getting UTXOs: ${utxoResponse.statusText}`);
  }

  const userUTXOs = await utxoResponse.json();

  const modifiedUTXOs = await Promise.all(
    userUTXOs.map(async (utxo: UTXO) => {
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
    })
  );
  return modifiedUTXOs;
}

/**
 * Gets the Balance of a given Bitcoin Payment object's Address.
 *
 * @param payment - The Payment object to get the Balance of.
 * @param bitcoinBlockchainAPIURL - The Bitcoin Blockchain URL used to fetch the  User's UTXOs.
 * @returns A Promise that resolves to the Balance of the User's Bitcoin Address.
 */
export async function getBalance(
  payment: P2Ret | P2TROut,
  bitcoinBlockchainAPIURL: string
): Promise<number> {
  const userAddress = payment.address;

  if (!userAddress) {
    throw new Error('Payment is missing Address');
  }

  const utxoResponse = await fetch(`${bitcoinBlockchainAPIURL}/address/${userAddress}/utxo`);

  if (!utxoResponse.ok) {
    throw new Error(`Error getting UTXOs: ${utxoResponse.statusText}`);
  }

  const userUTXOs: UTXO[] = await utxoResponse.json();

  const balanceInSats = userUTXOs.reduce((total, utxo) => total + utxo.value, 0);

  return balanceInSats;
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
  bitcoinNetwork: Network
): BitcoinInputSigningConfig[] {
  const networkIndex = getBitcoinNetworkIndex(bitcoinNetwork);

  const nativeSegwitDerivationPath = `m/84'/${networkIndex}'/${walletAccountIndex}'/0/${walletAddressIndex}`;
  const taprootDerivationPath = `m/86'/${networkIndex}'/${walletAccountIndex}'/0/${walletAddressIndex}`;
  const multisigDerivationPath = `m/86'/${networkIndex}'/${walletAccountIndex}'/0/0`;

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
  bitcoinTransaction: BitcoinTransaction,
  script: Uint8Array
): BitcoinTransactionVectorOutput | undefined {
  return bitcoinTransaction.vout.find(output =>
    validateScript(script, hexToBytes(output.scriptpubkey))
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

export function finalizeUserInputs(transaction: Transaction, userPayment: P2TROut | P2Ret): void {
  createRangeFromLength(transaction.inputsLength).forEach(index => {
    const inputScript = transaction.getInput(index).witnessUtxo?.script;
    if (inputScript && compareUint8Arrays(inputScript, userPayment.script))
      transaction.finalizeIdx(index);
  });
}

export function getBitcoinNetworkIndex(bitcoinNetwork: Network): number {
  switch (bitcoinNetwork) {
    case bitcoin:
      return 0;
    case testnet:
    case regtest:
      return 1;
    default:
      throw new Error('Unsupported Bitcoin Network');
  }
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
