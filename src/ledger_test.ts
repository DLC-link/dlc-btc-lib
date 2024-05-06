/** @format */

import Transport from '@ledgerhq/hw-transport-node-hid';
import { testnet } from 'bitcoinjs-lib/src/networks.js';
import { AppClient, DefaultWalletPolicy, WalletPolicy } from 'ledger-bitcoin';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { initEccLib } from 'bitcoinjs-lib';

type BitcoinNetworkName = 'Mainnet' | 'Testnet';

const TEST_EXTENDED_PRIVATE_KEY =
  'tprv8ZgxMBicQKsPdUfw7LM946yzMWhPrDtmBpB3R5Czx3u98TB2bXgUnkGQbPrNaQ8VQsbjNYseSsggRETuFExqhHoAoqCbrcpVj8pWShR5eQy';
const TEST_EXTENDED_PUBLIC_KEY =
  'tpubD6NzVbkrYhZ4Wwhizz1jTWe6vYDL1Z5fm7mphbFJNKhXxwRoDvW4yEtGmWJ6n9JE86wpvQsDpzn5t49uenYStgAqwgmKNjDe1D71TdAjy8o';
const TEST_MASTER_FINGERPRINT = '8400dc04';
const TAPROOT_UNSPENDABLE_KEY_STRING = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';

const TEST_EXTENDED_PRIVATE_KEY_2 =
  'tprv8ZgxMBicQKsPfJ6T1H5ErNLa1fZyj2fxCR7vRqVokCLvWg9JypYJoGVdvU6UNkj59o6qDdB97QFk7CQa2XnKZGSzQGhfoc4hCGXrviFuxwP';
const TEST_EXTENDED_PUBLIC_KEY_2 =
  'tpubD6NzVbkrYhZ4Ym8EtvjqFmzgah5utMrrmiihiMY7AU9KMAQ5cDMtym7W6ccSUinTVbDqK1Vno96HNhaqhS1DuVCrjHoFG9bFa3DKUUMErCv';
const TEST_MASTER_FINGERPRINT_2 = 'b2cd3e18';

initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

export async function main(transport: any) {
  const bitcoinNetworkName: BitcoinNetworkName = 'Testnet';

  // ==> Create a new instance of the AppClient
  const ledgerApp = new AppClient(transport);

  // ==> Get Ledger Master Fingerprint
  const fpr = await ledgerApp.getMasterFingerprint();

  // ==> Register Taproot Multisig Wallet ##########################################################
  const derivationPath = "86'/1'/0'";

  // ==> Get Ledger Derived Public Key
  const ledgerExtendedPublicKey = await ledgerApp.getExtendedPubkey(`m/${derivationPath}`);

  console.log(`[Ledger][${bitcoinNetworkName}] Ledger Extended Public Key: ${ledgerExtendedPublicKey}`);

  // ==> Get External Derived Public Keys
  const externalExtendedPublicKey1 = bip32
    .fromBase58(TEST_EXTENDED_PRIVATE_KEY, testnet)
    .derivePath(`m/${derivationPath}`)
    .neutered()
    .toBase58();

  const externalExtendedPublicKey2 = bip32
    .fromBase58(TEST_EXTENDED_PRIVATE_KEY_2, testnet)
    .derivePath(`m/${derivationPath}`)
    .neutered()
    .toBase58();

  console.log(`[Ledger][${bitcoinNetworkName}] External Extended Public Key: ${externalExtendedPublicKey1}`);
  console.log(`[Ledger][${bitcoinNetworkName}] External Extended Public Key: ${externalExtendedPublicKey2}`);

  // ==> Create Key Info
  const ledgerKeyInfo = `[${fpr}/${derivationPath}]${ledgerExtendedPublicKey}`;
  const externalKeyInfo1 = `[${TEST_MASTER_FINGERPRINT}/${derivationPath}]${externalExtendedPublicKey1}`;
  const externalKeyInfo2 = `[${TEST_MASTER_FINGERPRINT_2}/${derivationPath}]${externalExtendedPublicKey2}`;

  // ==> Create Multisig Wallet Policy
  // I tried with both the keyInfo as you suggested in the example, and with the actual key, but it didn't work.
  const multisigPolicy = new WalletPolicy('Multisig Taproot Wallet', `tr(@0/**,and_v(v:pk(@1/**),pk(@2/**)))`, [
    externalKeyInfo1,
    externalKeyInfo2,
    ledgerKeyInfo,
  ]);

  // ==> Register Wallet
  const [policyId, policyHmac] = await ledgerApp.registerWallet(multisigPolicy);

  console.log(`Policy hmac: ${policyHmac.toString('hex')}. Store it safely (together with the policy).`);

  console.assert(policyId.compare(multisigPolicy.getId()) == 0); //

  const multisigAddress = await ledgerApp.getWalletAddress(multisigPolicy, policyHmac, 0, 0, true);
  console.log(`Taproot Multisig Wallet Address: ${multisigAddress}`);
}

export async function testLedger() {
  Transport.default
    .create()
    .then((transport) => main(transport))
    .catch(console.error);
}
