/** @format */

import { BitGoAPI } from '@bitgo/sdk-api';
import Transport from '@ledgerhq/hw-transport-node-hid';
import { AppClient, DefaultWalletPolicy, WalletPolicy } from 'ledger-bitcoin';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { testnet } from 'bitcoinjs-lib/src/networks.js';
import { p2wpkh } from 'bitcoinjs-lib/src/payments/p2wpkh.js';
import { p2tr } from 'bitcoinjs-lib/src/payments/p2tr.js';
import { Payment, crypto, initEccLib } from 'bitcoinjs-lib';
import { bytesToHex, randomBytes } from '@noble/hashes/utils';

initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

type BitcoinNetworkName = 'Mainnet' | 'Testnet';

const TEST_EXTENDED_PRIVATE_KEY =
  'tprv8ZgxMBicQKsPdUfw7LM946yzMWhPrDtmBpB3R5Czx3u98TB2bXgUnkGQbPrNaQ8VQsbjNYseSsggRETuFExqhHoAoqCbrcpVj8pWShR5eQy';
const TEST_EXTENDED_PUBLIC_KEY =
  'tpubD6NzVbkrYhZ4Wwhizz1jTWe6vYDL1Z5fm7mphbFJNKhXxwRoDvW4yEtGmWJ6n9JE86wpvQsDpzn5t49uenYStgAqwgmKNjDe1D71TdAjy8o';

export function createScripts(): {
  nativeSegwitPublicKey: Buffer;
  nativeSegwitScript: Payment;
  taprootPublicKey: Buffer;
  taprootScript: Payment;
} {
  const bitcoinNetwork = testnet;

  const seedBytes = randomBytes(32);
  console.log('Seed Bytes:', bytesToHex(seedBytes));

  const node = bip32.fromSeed(Buffer.from(seedBytes), bitcoinNetwork);

  const extendedPrivateKey = node.toBase58();
  console.log('Extended private key:', extendedPrivateKey);

  const extendedPublicKey = node.neutered().toBase58();
  console.log('Extended public key:', extendedPublicKey);

  const nativeSegwitPublicKey = node.derivePath("m/48'/1'/0'/2'").publicKey;
  console.log('derivation path:', "m/48'/1'/0'/2'");
  console.log('Native Segwit Public key:', bytesToHex(nativeSegwitPublicKey));

  const nativeSegwitScript = p2wpkh({ pubkey: nativeSegwitPublicKey, network: bitcoinNetwork });
  console.log('Native Segwit Script:', nativeSegwitScript.address);

  const taprootPublicKey = node.derivePath("m/48'/1'/0'/2").publicKey;
  const childNode = node.derivePath("48'/1'/0'/2");
  console.log('derivation path:', "m/48'/1'/0'/2");
  console.log('Taproot Public key:', bytesToHex(taprootPublicKey));

  const taprootScript = p2tr({ pubkey: taprootPublicKey.subarray(1), network: bitcoinNetwork });
  console.log('Taproot Script:', taprootScript.address);

  return { nativeSegwitPublicKey, nativeSegwitScript, taprootPublicKey, taprootScript };
}

export function getScripts(): {
  masterFingerPrint: string;
  extendedPrivateKey: string;
  extendedPublicKey: string;
  nativeSegwitPublicKeyBuffer: Buffer;
  nativeSegwitScript: Payment;
  taprootPublicKeyBuffer: Buffer;
  taprootScript: Payment;
} {
  const bitcoinNetwork = testnet;

  const extendedPrivateKey = TEST_EXTENDED_PRIVATE_KEY;
  const extendedPublicKey = TEST_EXTENDED_PUBLIC_KEY;

  const node = bip32.fromBase58(extendedPrivateKey, bitcoinNetwork);
  const masterFingerPrint = node.fingerprint.toString('hex');
  console.log('Master Fingerprint', masterFingerPrint);

  const nativeSegwitPublicKey = '03f78d72404f69d1a51dd0a7d9678ad4bc996a4aaa6209754e851178bb88114ebe';
  const nativeSegwitPublicKeyBuffer = Buffer.from(nativeSegwitPublicKey, 'hex');

  const taprootPublicKey = '031659fc866efa6444657305c60b44e3695045e19dde669658a41a11b7b44f72ec';
  const taprootPublicKeyBuffer = Buffer.from(taprootPublicKey, 'hex');

  const nativeSegwitScript = p2wpkh({ pubkey: nativeSegwitPublicKeyBuffer, network: bitcoinNetwork });
  console.log('Native Segwit Script:', nativeSegwitScript);

  const taprootScript = p2tr({ pubkey: taprootPublicKeyBuffer.subarray(1), network: bitcoinNetwork });
  console.log('Taproot Script:', taprootScript);

  return {
    masterFingerPrint,
    extendedPrivateKey,
    extendedPublicKey,
    nativeSegwitPublicKeyBuffer,
    nativeSegwitScript,
    taprootPublicKeyBuffer,
    taprootScript,
  };
}

export async function main(transport: any) {
  const bitcoinNetworkName: BitcoinNetworkName = 'Testnet';

  // ==> Create a new instance of the AppClient
  const ledgerApp = new AppClient(transport);

  // ==> Get the master key fingerprint
  const fpr = await ledgerApp.getMasterFingerprint();

  // ==> Get and display on screet the first native segwit address
  const ledgerFirstNativeSegwitAccountPubkey = await ledgerApp.getExtendedPubkey("m/84'/1'/0'");
  const ledgerFirstNativeSegwitAccountPolicy = new DefaultWalletPolicy(
    'wpkh(@0/**)',
    `[${fpr}/84'/1'/0']${ledgerFirstNativeSegwitAccountPubkey}`
  );

  const ledgerFirstNativeSegwitAccountAddress = await ledgerApp.getWalletAddress(
    ledgerFirstNativeSegwitAccountPolicy,
    null,
    0,
    0,
    true // show address on the wallet's screen
  );

  console.log(`[Ledger][${bitcoinNetworkName}] Native Segwit Address:',${ledgerFirstNativeSegwitAccountAddress}`);

  // ==> Get and display on screen the first taproot address
  const ledgerFirstTaprootAccountPubkey = await ledgerApp.getExtendedPubkey("m/86'/1'/0'");
  const ledgerFirstTaprootAccountPolicy = new DefaultWalletPolicy(
    'tr(@0/**)',
    `[${fpr}/86'/1'/0']${ledgerFirstTaprootAccountPubkey}`
  );

  const ledgerFirstTaprootAccountAddress = await ledgerApp.getWalletAddress(
    ledgerFirstTaprootAccountPolicy,
    null,
    0,
    0,
    true // show address on the wallet's screen
  );

  console.log(`[Ledger][${bitcoinNetworkName}] Taproot Address:',${ledgerFirstTaprootAccountAddress}`);

  const {
    masterFingerPrint,
    extendedPrivateKey,
    extendedPublicKey,
    nativeSegwitPublicKeyBuffer,
    nativeSegwitScript,
    taprootPublicKeyBuffer,
    taprootScript,
  } = getScripts();

  // ==> Try to register a native segwit multisig wallet ##########################################################
  const ledgerExtendedPublicKeyNativeSegwit = await ledgerApp.getExtendedPubkey("m/48'/1'/0'/2'");

  const ledgerKeyInfo = `[${fpr}/48'/1'/0'/2']${ledgerExtendedPublicKeyNativeSegwit}`;
  const externalKeyInfo = `[${masterFingerPrint}/48'/1'/0'/2']${extendedPublicKey}`;

  console.log(`[Ledger][${bitcoinNetworkName}] Ledger Key Info: ${ledgerKeyInfo}`);
  console.log(`[Ledger][${bitcoinNetworkName}] External Key Info: ${externalKeyInfo}`);

  const multisigPolicy = new WalletPolicy(
    'Attestor Native Segwit Multisig Test Wallet',
    'wsh(sortedmulti(2,@0/**,@1/**))', // a 2-of-2 multisig policy template
    [ledgerKeyInfo, externalKeyInfo]
  );

  const [policyId, policyHmac] = await ledgerApp.registerWallet(multisigPolicy);

  console.log(`Policy hmac: ${policyHmac.toString('hex')}. Store it safely (together with the policy).`);

  console.assert(policyId.compare(multisigPolicy.getId()) == 0); //  should never fail

  const multisigAddress = await ledgerApp.getWalletAddress(multisigPolicy, policyHmac, 0, 0, true);
  console.log(`Taproot Multisig Wallet Address: ${multisigAddress}`);

  // #########################################################################################################

  // ==> Try to register a taproot multisig wallet ##########################################################
  // const ledgerExtendedPublicKey = await ledgerApp.getExtendedPubkey("m/48'/1'/0'/2'");
  // const ledgerDerivedPublicKey = bip32.fromBase58(ledgerExtendedPublicKey, testnet).publicKey.toString('hex');

  // const externalDerivedPublicKey = bip32
  //   .fromBase58(extendedPrivateKey, testnet)
  //   .derivePath("m/48'/1'/0'/2'")
  //   .neutered()
  //   .publicKey.toString('hex');

  // console.log(`[Ledger][${bitcoinNetworkName}] Ledger Key Info: ${ledgerDerivedPublicKey}`);
  // console.log(`[Ledger][${bitcoinNetworkName}] External Key Info: ${externalDerivedPublicKey}`);

  // const multisigPolicy = new WalletPolicy(
  //   'Attestor Taproot Multisig Test Wallet',
  //   'tr(c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5,sortedmulti_a(2,@0/**,@1/**))', // a 2-of-2 multisig policy template
  //   [ledgerDerivedPublicKey, externalDerivedPublicKey]
  // );

  // const [policyId, policyHmac] = await ledgerApp.registerWallet(multisigPolicy);

  // console.log(`Policy hmac: ${policyHmac.toString('hex')}. Store it safely (together with the policy).`);

  // console.assert(policyId.compare(multisigPolicy.getId()) == 0); //  should never fail

  // const multisigAddress = await ledgerApp.getWalletAddress(multisigPolicy, policyHmac, 0, 0, true);
  // console.log(`Taproot Multisig Wallet Address: ${multisigAddress}`);

  // #########################################################################################################

  // ==> Sign a psbt

  // TODO: set a wallet policy and a valid psbt file in order to test psbt signing
  // const psbt =
  //   '70736274ff010071020000000111b61619d08730f0cf8b5de372cd7ca44f054e045b4ecea02f96712176f420650000000000ffffffff021027000000000000160014f28ec1a3e3df0240b98582ca7754e6948e9bf9308ad00e0000000000160014050d6838a98c0118a3c0c9f6b29113a92786d11b000000000001012b40420f0000000000225120e75653f5ff98c7599371c2281d0bdb779a3226f6965597341ffd7df5002884712215c1b8324240b1e45eaf38372905f0ce78e68eeb0a396989e9b5501fcef67da9e7b94520dc544c17af0887dfc8ca9936755c9fdef0c79bbc8866cd69bf120c71509742d2ad200c0bf55fa1ab72462467b973b13e556b07d2fdd8d7a30cdfc10f337e23c7ac00acc0011720b8324240b1e45eaf38372905f0ce78e68eeb0a396989e9b5501fcef67da9e7b901182020903c29de21211eef47fd1b0940f7ab462d46c518087261ceb7bb2d00810001000000'; // a base64-encoded psbt, or a binary psbt in a Buffer
  // const signingPolicy = firstTaprootAccountPolicy; // an instance of WalletPolicy
  // const signingPolicyHmac = null; // if not a default wallet policy, this must also be set
  // if (!psbt || !signingPolicy) {
  //   console.log('Nothing to sign :(');
  //   await transport.close();
  //   return;
  // }

  // const psbtBuffer = Buffer.from(psbt, 'hex');

  // result will be a list of triples [i, partialSig], where:
  // - i is the input index
  // - partialSig is an instance of PartialSignature; it contains a pubkey and a signature,
  //   and it might contain a tapleaf_hash.
  // const result = await app.signPsbt(psbtBuffer, signingPolicy, signingPolicyHmac);

  // console.log('Returned signatures:');
  // console.log(result);

  // await transport.close();
}

export async function testLedger() {
  Transport.default
    .create()
    .then((transport) => main(transport))
    .catch(console.error);
}
