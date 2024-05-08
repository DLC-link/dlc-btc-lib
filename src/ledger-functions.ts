/** @format */

import { p2wpkh } from '@scure/btc-signer';
import { BIP32Factory } from 'bip32';
import { Network, initEccLib } from 'bitcoinjs-lib';
import * as ellipticCurveCryptography from 'tiny-secp256k1';
import { AppClient, DefaultWalletPolicy, WalletPolicy } from 'ledger-bitcoin';
import { P2Ret, P2TROut, p2tr, p2tr_ns } from '@scure/btc-signer/payment';
import { TEST_EXTENDED_PRIVATE_KEY_1, TEST_EXTENDED_PRIVATE_KEY_2 } from './constants.js';

initEccLib(ellipticCurveCryptography);
const bip32 = BIP32Factory(ellipticCurveCryptography);

export async function getNativeSegwitAccount(
  ledgerApp: AppClient,
  fpr: string,
  bitcoinNetwork: Network,
  bitcoinNetworkName: string,
  rootNativeSegwitDerivationPath: string
): Promise<{
  lednerNativeSegwitAccountPolicy: DefaultWalletPolicy;
  nativeSegwitAddress: string;
  nativeSegwitDerivedPublicKey: Buffer;
  nativeSegwitPayment: P2Ret;
}> {
  // ==> Get Ledger Master Fingerprint

  // ==> Get Ledger First Native Segwit Extended Public Key
  const ledgerFirstNativeSegwitExtendedPublicKey = await ledgerApp.getExtendedPubkey(
    `m${rootNativeSegwitDerivationPath}`
  );
  console.log(
    `[Ledger][${bitcoinNetworkName}] Ledger First Native Segwit Extended Public Key: ${ledgerFirstNativeSegwitExtendedPublicKey}`
  );

  // ==> Get Ledger First Native Segwit Account Policy
  const lednerNativeSegwitAccountPolicy = new DefaultWalletPolicy(
    'wpkh(@0/**)',
    `[${fpr}/${rootNativeSegwitDerivationPath}]${ledgerFirstNativeSegwitExtendedPublicKey}`
  );

  // ==> Get Ledger First Native Segwit Address
  const ledgerNativeSegwitAccountAddress = await ledgerApp.getWalletAddress(
    lednerNativeSegwitAccountPolicy,
    null,
    0,
    0,
    false
  );
  console.log(
    `[Ledger][${bitcoinNetworkName}] Ledger First Native Segwit Account Address: ${ledgerNativeSegwitAccountAddress}`
  );

  const nativeSegwitDerivedPublicKey = bip32
    .fromBase58(ledgerFirstNativeSegwitExtendedPublicKey, bitcoinNetwork)
    .derivePath('0/0').publicKey;

  // ==> Get derivation path for Ledger Native Segwit Address
  const nativeSegwitPayment = p2wpkh(nativeSegwitDerivedPublicKey, bitcoinNetwork);

  console.log(`[Ledger][${bitcoinNetworkName}] Recreated Native Segwit Address: ${nativeSegwitPayment.address}`);

  if (nativeSegwitPayment.address !== ledgerNativeSegwitAccountAddress) {
    throw new Error(
      `[Ledger][${bitcoinNetworkName}] Recreated Native Segwit Address does not match the Ledger Native Segwit Address`
    );
  }

  return {
    lednerNativeSegwitAccountPolicy,
    nativeSegwitAddress: ledgerNativeSegwitAccountAddress,
    nativeSegwitDerivedPublicKey,
    nativeSegwitPayment,
  };
}

export async function getTaprootMultisigAccount(
  ledgerApp: AppClient,
  fpr: string,
  bitcoinNetwork: Network,
  bitcoinNetworkName: string,
  rootTaprootDerivationPath: string
): Promise<{
  ledgerTaprootMultisigAccountPolicy: WalletPolicy;
  ledgerTaprootMultisigPolicyHMac: Buffer;
  taprootMultisigAddress: string;
  taprootDerivedPublicKey: Buffer;
  taprootMultisigPayment: P2TROut;
}> {
  // ==> Get Ledger Derived Public Key
  const ledgerExtendedPublicKey = await ledgerApp.getExtendedPubkey(`m/${rootTaprootDerivationPath}`);

  // ==> Get External Derived Public Keys
  const unspendableExtendedPublicKey = bip32
    .fromBase58(TEST_EXTENDED_PRIVATE_KEY_1, bitcoinNetwork)
    .derivePath(`m/${rootTaprootDerivationPath}`)
    .neutered()
    .toBase58();

  const externalExtendedPublicKey = bip32
    .fromBase58(TEST_EXTENDED_PRIVATE_KEY_2, bitcoinNetwork)
    .derivePath(`m/${rootTaprootDerivationPath}`)
    .neutered()
    .toBase58();

  console.log(`[Ledger][${bitcoinNetworkName}] Ledger Extended Public Key: ${ledgerExtendedPublicKey}`);
  console.log(`[Ledger][${bitcoinNetworkName}] Unspendable Extended Public Key 1: ${unspendableExtendedPublicKey}`);
  console.log(`[Ledger][${bitcoinNetworkName}] External Extended Public Key 2: ${externalExtendedPublicKey}`);

  // ==> Create Key Info
  const ledgerKeyInfo = `[${fpr}/${rootTaprootDerivationPath}]${ledgerExtendedPublicKey}`;
  console.log(`[Ledger][${bitcoinNetworkName}] Ledger Key Info: ${ledgerKeyInfo}`);

  // ==> Create Multisig Wallet Policy
  const ledgerTaprootMultisigAccountPolicy = new WalletPolicy(
    'Multisig Taproot Wallet',
    `tr(@0/**,and_v(v:pk(@1/**),pk(@2/**)))`,
    [unspendableExtendedPublicKey, externalExtendedPublicKey, ledgerKeyInfo]
  );

  // ==> Register Wallet
  const [policyId, policyHmac] = await ledgerApp.registerWallet(ledgerTaprootMultisigAccountPolicy);

  console.log(`[Ledger][${bitcoinNetworkName}] Policy HMac: ${policyHmac.toString('hex')}`);

  // => Assert Policy ID
  console.assert(policyId.compare(ledgerTaprootMultisigAccountPolicy.getId()) == 0); //

  // ==> Get Wallet Address from Ledger
  const ledgerTaprootMultisigAddress = await ledgerApp.getWalletAddress(
    ledgerTaprootMultisigAccountPolicy,
    policyHmac,
    0,
    0,
    false
  );
  console.log(
    `[Ledger][${bitcoinNetworkName}] Ledger Taproot Multisig Wallet Address: ${ledgerTaprootMultisigAddress}`
  );

  const externalDerivedPublicKey = bip32
    .fromBase58(externalExtendedPublicKey, bitcoinNetwork)
    .derivePath('0/0').publicKey;
  const unspendableDerivedPublicKey = bip32
    .fromBase58(unspendableExtendedPublicKey, bitcoinNetwork)
    .derivePath('0/0').publicKey;
  const ledgerDerivedPublicKey = bip32.fromBase58(ledgerExtendedPublicKey, bitcoinNetwork).derivePath('0/0').publicKey;

  // ==> Recreate Multisig Address to retrieve script
  const taprootMultiLeafWallet = p2tr_ns(2, [externalDerivedPublicKey.subarray(1), ledgerDerivedPublicKey.subarray(1)]);

  const taprootMultisigPayment = p2tr(unspendableDerivedPublicKey.subarray(1), taprootMultiLeafWallet, bitcoinNetwork);

  if (ledgerTaprootMultisigAddress !== taprootMultisigPayment.address) {
    throw new Error(
      `[Ledger][${bitcoinNetworkName}] Recreated Multisig Address does not match the Ledger Multisig Address`
    );
  }

  return {
    ledgerTaprootMultisigAccountPolicy,
    ledgerTaprootMultisigPolicyHMac: policyHmac,
    taprootMultisigAddress: ledgerTaprootMultisigAddress,
    taprootDerivedPublicKey: ledgerDerivedPublicKey,
    taprootMultisigPayment,
  };
}
