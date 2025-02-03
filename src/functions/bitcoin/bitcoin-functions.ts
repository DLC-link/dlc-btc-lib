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
import { Network, address, initEccLib } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import { Decimal } from 'decimal.js';
import { equals, uniq } from 'ramda';
import { RawVault } from 'src/models/ethereum-models.js';
import * as ellipticCurveCryptography from 'tiny-secp256k1';

import { DUST_LIMIT } from '../../constants/dlc-handler.constants.js';
import {
  BitcoinInputSigningConfig,
  BitcoinTransaction,
  BitcoinTransactionVectorOutput,
  BlockData,
  FeeRates,
  HistoricalFeeRate,
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
initEccLib(ellipticCurveCryptography);

export function getFeeAmount(bitcoinAmount: number, feeBasisPoints: number): number {
  const feePercentage = new Decimal(feeBasisPoints).dividedBy(10000);
  return new Decimal(bitcoinAmount).times(feePercentage).trunc().toNumber();
}

export function removeDustOutputs(
  outputs: { address: string; amount: bigint }[],
  dustLimit = DUST_LIMIT
): void {
  for (let i = outputs.length - 1; i >= 0; i--) {
    if (outputs[i].amount < dustLimit) {
      outputs.splice(i, 1);
    }
  }
}

export function getDerivedUnspendablePublicKeyCommittedToUUID(
  vaultUUID: string,
  bitcoinNetwork: Network
): Buffer {
  return deriveUnhardenedPublicKey(
    getUnspendableKeyCommittedToUUID(vaultUUID, bitcoinNetwork),
    bitcoinNetwork
  );
}

/**
 * This function retrieves the Bitcoin address used to fund a Vault by analyzing the inputs and outputs of the Funding Transaction.
 *
 * @param vault - The Vault object containing the Funding Transaction ID and the User's Public Key.
 * @param bitcoinTransaction - The Bitcoin Transaction from which the Funding Address should be retrieved.
 * @param feeRecipient - The Fee Recipient's Public Key or Address.
 * @param extendedAttestorGroupPublicKey - The Extended Public Key of the Attestor Group.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param bitcoinBlockchainAPIURL - The Bitcoin Blockchain URL used to fetch the Funding Transaction.
 * @returns A promise that resolves to the Funding Bitcoin address.
 * @throws An error if the Vault Funding Address cannot be determined.
 */
export async function getVaultFundingBitcoinAddress(
  vault: RawVault,
  bitcoinTransaction: BitcoinTransaction,
  feeRecipient: string,
  extendedAttestorGroupPublicKey: string,
  bitcoinNetwork: Network
): Promise<string> {
  const multisigAddress = createTaprootMultisigPayment(
    getDerivedUnspendablePublicKeyCommittedToUUID(vault.uuid, bitcoinNetwork),
    deriveUnhardenedPublicKey(extendedAttestorGroupPublicKey, bitcoinNetwork),
    Buffer.from(vault.taprootPubKey, 'hex'),
    bitcoinNetwork
  ).address;

  const feeRecipientAddress = getFeeRecipientAddress(feeRecipient, bitcoinNetwork);

  const inputAddresses = uniq(
    bitcoinTransaction.vin.map(input => input.prevout.scriptpubkey_address)
  );

  // If the only input is the MultiSig address, it is a withdrawal transaction.
  // Therefore, the funding address is the non-fee recipient output address.
  // If there is a single non-MultiSig input that is not from the MultiSig address, or if there are multiple inputs, it is a funding/deposit transaction.
  // Therefore, the funding address is the non-MultiSig input address.
  const addresses =
    equals(inputAddresses.length, 1) && equals(inputAddresses.at(0), multisigAddress)
      ? bitcoinTransaction.vout
          .filter(output => output.scriptpubkey_address !== feeRecipientAddress)
          .map(output => output.scriptpubkey_address)
      : inputAddresses.filter(address => !equals(address, multisigAddress));

  if (!equals(addresses.length, 1))
    throw new Error('Could not determine the Vault Funding Address');

  return addresses.at(0)!;
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

export function createTaprootPayment(publicKey: Buffer, bitcoinNetwork: Network): P2TROut {
  return p2tr(publicKey, undefined, bitcoinNetwork);
}

export function createNativeSegwitPayment(publicKey: Buffer, bitcoinNetwork: Network): P2Ret {
  return p2wpkh(publicKey, bitcoinNetwork);
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
 * Fetches the last two blocks' fee rates from the bitcoin blockchain API.
 *
 * @returns A promise that resolves to the last two blocks' median fee rates.
 */
export async function getLastTwoBlocksFeeRateAverage(
  bitcoinBlockchainAPIFeeURL: string
): Promise<number> {
  const dayFeeRateAPI = `${bitcoinBlockchainAPIFeeURL}/api/v1/mining/blocks/fee-rates/24h`;

  const response = await fetch(dayFeeRateAPI);

  if (!response.ok) {
    throw new Error(`Bitcoin Blockchain Fee Rate Response was not OK: ${response.statusText}`);
  }

  const historicalFeeRates: HistoricalFeeRate[] = await response.json();

  return (
    historicalFeeRates
      .slice(historicalFeeRates.length - 2)
      .map(rate => rate.avgFee_50)
      .reduce((a, b) => a + b) / 2
  );
}

/**
 * Fetches the current mempool block median fee rate from the bitcoin blockchain API.
 *
 * @param bitcoinBlockchainAPIFeeURL
 * @returns
 */
export async function getCurrentMempoolBlockFeeRate(
  bitcoinBlockchainAPIFeeURL: string
): Promise<number> {
  const mempoolBlocksAPI = `${bitcoinBlockchainAPIFeeURL}/api/v1/fees/mempool-blocks`;

  const response = await fetch(mempoolBlocksAPI);

  if (!response.ok) {
    throw new Error(`Bitcoin Blockchain Fee Rate Response was not OK: ${response.statusText}`);
  }

  const currentBlockFeeRate: BlockData[] = await response.json();

  return currentBlockFeeRate[0].medianFee;
}

/**
 * Fetches the estimated fee rate from the bitcoin blockchain API.
 *
 * @returns A promise that resolves to the fastest fee rate.
 */
export async function getEstimatedFeeRate(bitcoinBlockchainAPIFeeURL: string): Promise<number> {
  const estimatedFeeAPI = `${bitcoinBlockchainAPIFeeURL}/api/v1/fees/recommended`;

  const response = await fetch(estimatedFeeAPI);

  if (!response.ok) {
    throw new Error(`Bitcoin Blockchain Fee Rate Response was not OK: ${response.statusText}`);
  }

  const feeRates: FeeRates = await response.json();

  return feeRates.fastestFee;
}

/**
 * Return the fee rate for the transaction.
 *
 * @returns A promise that resolves to the fee rate.
 */
export async function getFeeRate(
  bitcoinBlockchainAPIFeeURL: string,
  feeRateMultiplier = 1
): Promise<number> {
  const [lastTwoBlocksFeeRateAverage, currentBlockFeeRate, estimatedFeeRate] = await Promise.all([
    getLastTwoBlocksFeeRateAverage(bitcoinBlockchainAPIFeeURL),
    getCurrentMempoolBlockFeeRate(bitcoinBlockchainAPIFeeURL),
    getEstimatedFeeRate(bitcoinBlockchainAPIFeeURL),
  ]);

  return Math.ceil(
    Math.max(
      lastTwoBlocksFeeRateAverage * feeRateMultiplier,
      currentBlockFeeRate * feeRateMultiplier,
      estimatedFeeRate * feeRateMultiplier
    )
  );
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
 * Validates a Bitcoin Address.
 * @param bitcoinAddress
 * @param bitcoinNetwork
 * @returns A boolean indicating if the Bitcoin Address is valid.
 */
export function isBitcoinAddress(bitcoinAddress: string, bitcoinNetwork: Network): boolean {
  try {
    return !!address.toOutputScript(bitcoinAddress, bitcoinNetwork);
  } catch {
    return false;
  }
}

/**
 * Gets the Fee Recipient's Address from the Recipient's Public Key or Address.
 * @param bitcoinFeeRecipient - The Fee Recipient's Public Key or Address.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @returns The Fee Recipient's Address.
 */
export function getFeeRecipientAddress(
  bitcoinFeeRecipient: string,
  bitcoinNetwork: Network
): string {
  if (isBitcoinAddress(bitcoinFeeRecipient, bitcoinNetwork)) return bitcoinFeeRecipient;

  const { address } = p2wpkh(Buffer.from(bitcoinFeeRecipient, 'hex'), bitcoinNetwork);

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
