/** @format */

// /** @format */

import { BitGoAPI } from '@bitgo/sdk-api';
import Transport from '@ledgerhq/hw-transport-node-hid';
import { AppClient, DefaultWalletPolicy, WalletPolicy } from 'ledger-bitcoin';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { testnet } from 'bitcoinjs-lib/src/networks.js';
import { p2wpkh } from 'bitcoinjs-lib/src/payments/p2wpkh.js';
import { p2tr } from 'bitcoinjs-lib/src/payments/p2tr.js';
import { Payment, crypto, initEccLib } from 'bitcoinjs-lib';
import BitcoinApp from '@ledgerhq/hw-app-btc';

import { bytesToHex, randomBytes } from '@noble/hashes/utils';

initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

type BitcoinNetworkName = 'Mainnet' | 'Testnet';

const TEST_EXTENDED_PRIVATE_KEY =
  'tprv8ZgxMBicQKsPdUfw7LM946yzMWhPrDtmBpB3R5Czx3u98TB2bXgUnkGQbPrNaQ8VQsbjNYseSsggRETuFExqhHoAoqCbrcpVj8pWShR5eQy';
const TEST_EXTENDED_PUBLIC_KEY =
  'tpubD6NzVbkrYhZ4Wwhizz1jTWe6vYDL1Z5fm7mphbFJNKhXxwRoDvW4yEtGmWJ6n9JE86wpvQsDpzn5t49uenYStgAqwgmKNjDe1D71TdAjy8o';

const TEST_MASTER_FINGERPRINT = 'd34db33f';

// const TAPROOT_UNSPENDABLE_KEY_STRING = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';

// export function createScripts(): {
//   nativeSegwitPublicKey: Buffer;
//   nativeSegwitScript: Payment;
//   taprootPublicKey: Buffer;
//   taprootScript: Payment;
// } {
//   const bitcoinNetwork = testnet;

//   const seedBytes = randomBytes(32);
//   console.log('Seed Bytes:', bytesToHex(seedBytes));

//   const node = bip32.fromSeed(Buffer.from(seedBytes), bitcoinNetwork);

//   const extendedPrivateKey = node.toBase58();
//   console.log('Extended private key:', extendedPrivateKey);

//   const extendedPublicKey = node.neutered().toBase58();
//   console.log('Extended public key:', extendedPublicKey);

//   const nativeSegwitPublicKey = node.derivePath("m/48'/1'/0'/2'").publicKey;
//   console.log('derivation path:', "m/48'/1'/0'/2'");
//   console.log('Native Segwit Public key:', bytesToHex(nativeSegwitPublicKey));

//   const nativeSegwitScript = p2wpkh({ pubkey: nativeSegwitPublicKey, network: bitcoinNetwork });
//   console.log('Native Segwit Script:', nativeSegwitScript.address);

//   const taprootPublicKey = node.derivePath("m/48'/1'/0'/2").publicKey;
//   const childNode = node.derivePath("48'/1'/0'/2");
//   console.log('derivation path:', "m/48'/1'/0'/2");
//   console.log('Taproot Public key:', bytesToHex(taprootPublicKey));

//   const taprootScript = p2tr({ pubkey: taprootPublicKey.subarray(1), network: bitcoinNetwork });
//   console.log('Taproot Script:', taprootScript.address);

//   return { nativeSegwitPublicKey, nativeSegwitScript, taprootPublicKey, taprootScript };
// }

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
  const ledgerApp = new AppClient(transport);

  const fpr = await ledgerApp.getMasterFingerprint();

  const ledgerExtendedPublicKeyNativeSegwit = await ledgerApp.getExtendedPubkey("m/48'/1'/0'/2'");

  const ledgerKeyInfo = `[${fpr}/48'/1'/0'/2']${ledgerExtendedPublicKeyNativeSegwit}`;
  const externalKeyInfo = `[${TEST_MASTER_FINGERPRINT}/48'/1'/0'/2']${TEST_EXTENDED_PUBLIC_KEY}`;

  const multisigPolicy = new WalletPolicy(
    'Attestor Native Segwit Multisig Test Wallet',
    'wsh(sortedmulti(2,@0/**,@1/**))', // a 2-of-2 multisig policy template
    [ledgerKeyInfo, externalKeyInfo]
  );

  const [policyId, policyHmac] = await ledgerApp.registerWallet(multisigPolicy);

  const multisigAddress = await ledgerApp.getWalletAddress(multisigPolicy, policyHmac, 0, 0, true);

  await transport.close();
}

export async function testLedger() {
  Transport.default
    .create()
    .then((transport) => main(transport))
    .catch(console.error);
}
