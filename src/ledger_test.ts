/** @format */

import Transport from '@ledgerhq/hw-transport-node-hid';
import { Network, bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';
import { AppClient, DefaultWalletPolicy, WalletPolicy } from 'ledger-bitcoin';
import { BIP32Factory } from 'bip32';
import * as ellipticCurveCryptography from 'tiny-secp256k1';
import { Psbt, initEccLib } from 'bitcoinjs-lib';
import { p2tr, p2tr_ns, p2wpkh, Transaction } from '@scure/btc-signer';
import {
  addNativeSegwitSignaturesToPSBT,
  addTaprootInputSignaturesToPSBT,
  createBitcoinInputSigningConfiguration,
  createClosingTransaction,
  createFundingTransaction,
  getInputByPaymentTypeArray,
  updateNativeSegwitInputs,
  updateTaprootInputs,
} from './bitcoin-functions.js';
import { TEST_BITCOIN_AMOUNT, TEST_FEE_AMOUNT, TEST_FEE_PUBLIC_KEY, TEST_FEE_RATE } from './constants.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

type BitcoinNetworkName = 'Mainnet' | 'Testnet';

const TEST_EXTENDED_PRIVATE_KEY_1 =
  'tprv8ZgxMBicQKsPdUfw7LM946yzMWhPrDtmBpB3R5Czx3u98TB2bXgUnkGQbPrNaQ8VQsbjNYseSsggRETuFExqhHoAoqCbrcpVj8pWShR5eQy';
const TEST_EXTENDED_PUBLIC_KEY_1 =
  'tpubD6NzVbkrYhZ4Wwhizz1jTWe6vYDL1Z5fm7mphbFJNKhXxwRoDvW4yEtGmWJ6n9JE86wpvQsDpzn5t49uenYStgAqwgmKNjDe1D71TdAjy8o';
const TEST_MASTER_FINGERPRINT_1 = '8400dc04';

const TEST_EXTENDED_PRIVATE_KEY_2 =
  'tprv8ZgxMBicQKsPfJ6T1H5ErNLa1fZyj2fxCR7vRqVokCLvWg9JypYJoGVdvU6UNkj59o6qDdB97QFk7CQa2XnKZGSzQGhfoc4hCGXrviFuxwP';
const TEST_EXTENDED_PUBLIC_KEY_2 =
  'tpubD6NzVbkrYhZ4Ym8EtvjqFmzgah5utMrrmiihiMY7AU9KMAQ5cDMtym7W6ccSUinTVbDqK1Vno96HNhaqhS1DuVCrjHoFG9bFa3DKUUMErCv';
const TEST_MASTER_FINGERPRINT_2 = 'b2cd3e18';

const TAPROOT_UNSPENDABLE_KEY_STRING = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';

const ROOT_TAPROOT_DERIVATION_PATH = "86'/1'/0'";
const ROOT_NATIVE_SEGWIT_DERIVATION_PATH = "84'/1'/0'";

initEccLib(ellipticCurveCryptography);
const bip32 = BIP32Factory(ellipticCurveCryptography);

function getBitcoinNetwork(): [BitcoinNetworkName, Network] {
  const { BITCOIN_NETWORK } = process.env;
  switch (BITCOIN_NETWORK) {
    case 'Mainnet':
      return ['Mainnet', bitcoin];
    case 'Testnet':
      return ['Testnet', testnet];
    default:
      throw new Error('Invalid Bitcoin Network');
  }
}

export async function main(transport: any) {
  // ==> Get Bitcoin Network
  const [bitcoinNetworkName, bitcoinNetwork] = getBitcoinNetwork();

  // ==> Create a new instance of the AppClient
  const ledgerApp = new AppClient(transport);

  // ==> Get Ledger Master Fingerprint
  const fpr = await ledgerApp.getMasterFingerprint();

  // ==> Get Ledger First Native Segwit Extended Public Key
  const ledgerFirstNativeSegwitExtendedPublicKey = await ledgerApp.getExtendedPubkey(
    `m${ROOT_NATIVE_SEGWIT_DERIVATION_PATH}`
  );
  console.log(
    `[Ledger][${bitcoinNetworkName}] Ledger First Native Segwit Extended Public Key: ${ledgerFirstNativeSegwitExtendedPublicKey}`
  );

  // ==> Get Ledger First Native Segwit Account Policy
  const ledgerFirstNativeSegwitAccountPolicy = new DefaultWalletPolicy(
    'wpkh(@0/**)',
    `[${fpr}/${ROOT_NATIVE_SEGWIT_DERIVATION_PATH}]${ledgerFirstNativeSegwitExtendedPublicKey}`
  );

  console.log(
    `[Ledger][${bitcoinNetworkName}] Ledger First Native Segwit Account Policy: ${ledgerFirstNativeSegwitAccountPolicy.toString()}`
  );

  // ==> Get Ledger First Native Segwit Address
  const ledgerFirstNativeSegwitAccountAddress = await ledgerApp.getWalletAddress(
    ledgerFirstNativeSegwitAccountPolicy,
    null,
    0,
    0,
    true // show address on the wallet's screen
  );
  console.log(
    `[Ledger][${bitcoinNetworkName}] Ledger First Native Segwit Account Address: ${ledgerFirstNativeSegwitAccountAddress}`
  );

  const nativeSegwitDerivedPublicKey = bip32
    .fromBase58(ledgerFirstNativeSegwitExtendedPublicKey, testnet)
    .derivePath('0/0').publicKey;

  // ==> Get derivation path for Ledger Native Segwit Address
  const nativeSegwitTransaction = p2wpkh(nativeSegwitDerivedPublicKey, bitcoinNetwork);

  console.log(`[Ledger][${bitcoinNetworkName}] Recreated Native Segwit Address: ${nativeSegwitTransaction.address}`);

  if (nativeSegwitTransaction.address !== ledgerFirstNativeSegwitAccountAddress) {
    throw new Error(
      `[Ledger][${bitcoinNetworkName}] Recreated Native Segwit Address does not match the Ledger Native Segwit Address`
    );
  }

  // ==> Get Ledger Derived Public Key
  const ledgerExtendedPublicKey = await ledgerApp.getExtendedPubkey(`m/${ROOT_TAPROOT_DERIVATION_PATH}`);

  // ==> Get External Derived Public Keys
  const unspendableExtendedPublicKey = bip32
    .fromBase58(TEST_EXTENDED_PRIVATE_KEY_1, bitcoinNetwork)
    .derivePath(`m/${ROOT_TAPROOT_DERIVATION_PATH}`)
    .neutered()
    .toBase58();

  const externalExtendedPublicKey = bip32
    .fromBase58(TEST_EXTENDED_PRIVATE_KEY_2, bitcoinNetwork)
    .derivePath(`m/${ROOT_TAPROOT_DERIVATION_PATH}`)
    .neutered()
    .toBase58();

  console.log(`[Ledger][${bitcoinNetworkName}] Ledger Extended Public Key: ${ledgerExtendedPublicKey}`);
  console.log(`[Ledger][${bitcoinNetworkName}] Unspendable Extended Public Key 1: ${unspendableExtendedPublicKey}`);
  console.log(`[Ledger][${bitcoinNetworkName}] External Extended Public Key 2: ${externalExtendedPublicKey}`);

  // ==> Create Key Info
  const ledgerKeyInfo = `[${fpr}/${ROOT_TAPROOT_DERIVATION_PATH}]${ledgerExtendedPublicKey}`;
  console.log(`[Ledger][${bitcoinNetworkName}] Ledger Key Info: ${ledgerKeyInfo}`);

  // We don't need to create the external key info, as we can use the extended public key directly.
  // const externalKeyInfo1 = `[${TEST_MASTER_FINGERPRINT_1}/${derivationPath}]${externalExtendedPublicKey1}`;
  // const externalKeyInfo2 = `[${TEST_MASTER_FINGERPRINT_2}/${derivationPath}]${externalExtendedPublicKey2}`;

  // ==> Create Multisig Wallet Policy
  const ledgerMultisigPolicy = new WalletPolicy('Multisig Taproot Wallet', `tr(@0/**,and_v(v:pk(@1/**),pk(@2/**)))`, [
    unspendableExtendedPublicKey,
    externalExtendedPublicKey,
    ledgerKeyInfo,
  ]);

  // ==> Register Wallet
  const [policyId, policyHmac] = await ledgerApp.registerWallet(ledgerMultisigPolicy);

  console.log(`[Ledger][${bitcoinNetworkName}] Policy HMac: ${policyHmac.toString('hex')}`);

  // => Assert Policy ID
  console.assert(policyId.compare(ledgerMultisigPolicy.getId()) == 0); //

  // ==> Get Wallet Address from Ledger
  const ledgerMultisigAddress = await ledgerApp.getWalletAddress(ledgerMultisigPolicy, policyHmac, 0, 0, true);
  console.log(`[Ledger][${bitcoinNetworkName}] Ledger Taproot Multisig Wallet Address: ${ledgerMultisigAddress}`);

  // ==> Recreate Multisig Address to retrieve script
  const multiLeafWallet = p2tr_ns(2, [
    bip32.fromBase58(externalExtendedPublicKey, bitcoinNetwork).derivePath('0/0').publicKey.subarray(1),
    bip32.fromBase58(ledgerExtendedPublicKey, bitcoinNetwork).derivePath('0/0').publicKey.subarray(1),
  ]);

  const multisigTransaction = p2tr(
    bip32.fromBase58(unspendableExtendedPublicKey, bitcoinNetwork).derivePath('0/0').publicKey.subarray(1),
    multiLeafWallet,
    bitcoinNetwork
  );

  if (ledgerMultisigAddress !== multisigTransaction.address) {
    throw new Error(
      `[Ledger][${bitcoinNetworkName}] Recreated Multisig Address does not match the Ledger Multisig Address`
    );
  }

  // ==> Create Funding Transaction
  const fundingPSBT = await createFundingTransaction(
    TEST_BITCOIN_AMOUNT,
    bitcoinNetwork,
    multisigTransaction.address,
    nativeSegwitTransaction,
    TEST_FEE_RATE,
    TEST_FEE_PUBLIC_KEY,
    TEST_FEE_AMOUNT
  );

  // ==> Update Funding PSBT with Ledger related information
  const signingConfiguration = createBitcoinInputSigningConfiguration(fundingPSBT, bitcoinNetwork);

  console.log(`[Ledger][${bitcoinNetworkName}] Signing Configuration: ${signingConfiguration}`);

  const formattedFundingPSBT = Psbt.fromBuffer(Buffer.from(fundingPSBT), {
    network: bitcoinNetwork,
  });

  const inputByPaymentTypeArray = getInputByPaymentTypeArray(
    signingConfiguration,
    formattedFundingPSBT.toBuffer(),
    bitcoinNetwork
  );

  await updateNativeSegwitInputs(inputByPaymentTypeArray, nativeSegwitDerivedPublicKey, fpr, formattedFundingPSBT);

  // ==> Sign Funding PSBT with Ledger
  const fundingTransactionSignatures = await ledgerApp.signPsbt(
    formattedFundingPSBT.toBase64(),
    ledgerFirstNativeSegwitAccountPolicy,
    null
  );

  console.log('[Ledger][${bitcoinNetworkName}] Funding PSBT Ledger Signatures:', fundingTransactionSignatures);

  addNativeSegwitSignaturesToPSBT(formattedFundingPSBT, fundingTransactionSignatures);

  const fundingTransaction = Transaction.fromPSBT(formattedFundingPSBT.toBuffer());

  // ==> Finalize Funding Transaction
  fundingTransaction.finalize();

  console.log('[Ledger][${bitcoinNetworkName}] Funding Transaction Signed By Ledger:', fundingTransaction);

  // ==> Create Closing PSBT
  const closingPSBT = await createClosingTransaction(
    TEST_BITCOIN_AMOUNT,
    bitcoinNetwork,
    fundingTransaction.id,
    multisigTransaction,
    nativeSegwitTransaction.address,
    TEST_FEE_RATE,
    TEST_FEE_PUBLIC_KEY,
    TEST_FEE_AMOUNT
  );

  // ==> Update Closing PSBT with Ledger related information
  const closingTransactionSigningConfiguration = createBitcoinInputSigningConfiguration(closingPSBT, bitcoinNetwork);

  const formattedClosingPSBT = Psbt.fromBuffer(Buffer.from(closingPSBT), {
    network: bitcoinNetwork,
  });

  const closingInputByPaymentTypeArray = getInputByPaymentTypeArray(
    closingTransactionSigningConfiguration,
    formattedClosingPSBT.toBuffer(),
    bitcoinNetwork
  );

  const taprootInputsToSign = closingInputByPaymentTypeArray
    .filter(([_, paymentType]) => paymentType === 'p2tr')
    .map(([index]) => index);

  updateTaprootInputs(
    taprootInputsToSign,
    bip32.fromBase58(ledgerExtendedPublicKey, bitcoinNetwork).derivePath('0/0').publicKey,
    fpr,
    formattedClosingPSBT
  );

  // ==> Sign Closing PSBT with Ledger
  const closingTransactionSignatures = await ledgerApp.signPsbt(
    formattedClosingPSBT.toBase64(),
    ledgerMultisigPolicy,
    policyHmac
  );

  console.log('[Ledger][${bitcoinNetworkName}] Closing PSBT Ledger Signatures:', closingTransactionSignatures);

  addTaprootInputSignaturesToPSBT(formattedClosingPSBT, closingTransactionSignatures);

  const closingTransaction = Transaction.fromPSBT(formattedClosingPSBT.toBuffer());

  console.log('[Ledger][${bitcoinNetworkName}] Closing Transaction Partially Signed By Ledger:', closingTransaction);
}

export async function testLedger() {
  Transport.default
    .create()
    .then((transport) => main(transport))
    .catch(console.error);
}
