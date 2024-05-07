/** @format */

import Transport from '@ledgerhq/hw-transport-node-hid';
import { testnet } from 'bitcoinjs-lib/src/networks.js';
import { AppClient, DefaultWalletPolicy, WalletPolicy } from 'ledger-bitcoin';
import { BIP32Factory } from 'bip32';
import * as ellipticCurveCryptography from 'tiny-secp256k1';
import { initEccLib } from 'bitcoinjs-lib';
import { p2tr, p2tr_ns, p2wpkh } from '@scure/btc-signer';

type BitcoinNetworkName = 'Mainnet' | 'Testnet';

const TEST_EXTENDED_PRIVATE_KEY_1 =
  'tprv8ZgxMBicQKsPdUfw7LM946yzMWhPrDtmBpB3R5Czx3u98TB2bXgUnkGQbPrNaQ8VQsbjNYseSsggRETuFExqhHoAoqCbrcpVj8pWShR5eQy';
const TEST_EXTENDED_PUBLIC_KEY_1 =
  'tpubD6NzVbkrYhZ4Wwhizz1jTWe6vYDL1Z5fm7mphbFJNKhXxwRoDvW4yEtGmWJ6n9JE86wpvQsDpzn5t49uenYStgAqwgmKNjDe1D71TdAjy8o';
const TEST_MASTER_FINGERPRINT_1 = '8400dc04';
const TAPROOT_UNSPENDABLE_KEY_STRING = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';

const TEST_EXTENDED_PRIVATE_KEY_2 =
  'tprv8ZgxMBicQKsPfJ6T1H5ErNLa1fZyj2fxCR7vRqVokCLvWg9JypYJoGVdvU6UNkj59o6qDdB97QFk7CQa2XnKZGSzQGhfoc4hCGXrviFuxwP';
const TEST_EXTENDED_PUBLIC_KEY_2 =
  'tpubD6NzVbkrYhZ4Ym8EtvjqFmzgah5utMrrmiihiMY7AU9KMAQ5cDMtym7W6ccSUinTVbDqK1Vno96HNhaqhS1DuVCrjHoFG9bFa3DKUUMErCv';
const TEST_MASTER_FINGERPRINT_2 = 'b2cd3e18';

const rootTaprootDerivationPath = "86'/1'/0'";
const rootSegwitDerivationPath = "86'/1'/0'";

initEccLib(ellipticCurveCryptography);
const bip32 = BIP32Factory(ellipticCurveCryptography);

export async function main(transport: any) {
  const bitcoinNetworkName: BitcoinNetworkName = 'Testnet';

  // ==> Create a new instance of the AppClient
  const ledgerApp = new AppClient(transport);

  // ==> Get Ledger Master Fingerprint
  const fpr = await ledgerApp.getMasterFingerprint();

  // ==> Get Ledger First Native Segwit Extended Public Key
  const ledgerFirstNativeSegwitExtendedPublicKey = await ledgerApp.getExtendedPubkey(`m/${rootSegwitDerivationPath}`);

  // ==> Get Ledger First Native Segwit Account Policy
  const ledgerFirstNativeSegwitAccountPolicy = new DefaultWalletPolicy(
    'wpkh(@0/**)',
    `[${fpr}/${rootSegwitDerivationPath}]${ledgerFirstNativeSegwitExtendedPublicKey}`
  );

  // ==> Get Ledger First Native Segwit Address
  const ledgerFirstNativeSegwitAccountAddress = await ledgerApp.getWalletAddress(
    ledgerFirstNativeSegwitAccountPolicy,
    null,
    0,
    0,
    true // show address on the wallet's screen
  );
  console.log(`Ledger First Native Segwit Account Address: ${ledgerFirstNativeSegwitAccountAddress}`);

  // ==> Get derivation path for Ledger Native Segwit Address
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(async (index) => {
    const nativeSegwitAddress = p2wpkh(
      bip32.fromBase58(ledgerFirstNativeSegwitExtendedPublicKey, testnet).derivePath(`0/${index}`).publicKey,
      testnet
    ).address;
    if (nativeSegwitAddress === ledgerFirstNativeSegwitAccountAddress) {
      console.log(`Found Ledger Native Segwit Address at derivation path ${rootSegwitDerivationPath}0/${index}`);
    }
  });

  // ==> Get Ledger Derived Public Key
  const ledgerExtendedPublicKey = await ledgerApp.getExtendedPubkey(`m/${rootTaprootDerivationPath}`);

  // ==> Get External Derived Public Keys
  const unspendableExtendedPublicKey = bip32
    .fromBase58(TEST_EXTENDED_PRIVATE_KEY_1, testnet)
    .derivePath(`m/${rootTaprootDerivationPath}`)
    .neutered()
    .toBase58();

  const externalExtendedPublicKey = bip32
    .fromBase58(TEST_EXTENDED_PRIVATE_KEY_2, testnet)
    .derivePath(`m/${rootTaprootDerivationPath}`)
    .neutered()
    .toBase58();

  console.log(`[Ledger][${bitcoinNetworkName}] Ledger Extended Public Key: ${ledgerExtendedPublicKey}`);
  console.log(`[Ledger][${bitcoinNetworkName}] Unspendable Extended Public Key 1: ${unspendableExtendedPublicKey}`);
  console.log(`[Ledger][${bitcoinNetworkName}] External Extended Public Key 2: ${externalExtendedPublicKey}`);

  // ==> Create Key Info
  const ledgerKeyInfo = `[${fpr}/${rootTaprootDerivationPath}]${ledgerExtendedPublicKey}`;
  console.log(`[Ledger][${bitcoinNetworkName}] Ledger Key Info: ${ledgerKeyInfo}`);

  // We don't need to create the external key info, as we can use the extended public key directly.
  // const externalKeyInfo1 = `[${TEST_MASTER_FINGERPRINT_1}/${derivationPath}]${externalExtendedPublicKey1}`;
  // const externalKeyInfo2 = `[${TEST_MASTER_FINGERPRINT_2}/${derivationPath}]${externalExtendedPublicKey2}`;

  // ==> Create Multisig Wallet Policy
  const multisigPolicy = new WalletPolicy('Multisig Taproot Wallet', `tr(@0/**,and_v(v:pk(@1/**),pk(@2/**)))`, [
    unspendableExtendedPublicKey,
    externalExtendedPublicKey,
    ledgerKeyInfo,
  ]);

  // ==> Register Wallet
  const [policyId, policyHmac] = await ledgerApp.registerWallet(multisigPolicy);

  console.log(`[Ledger][${bitcoinNetworkName}] Policy HMac: ${policyHmac.toString('hex')}`);

  // => Assert Policy ID
  console.assert(policyId.compare(multisigPolicy.getId()) == 0); //

  // ==> Get Wallet Address from Ledger
  const multisigAddressFromLedger = await ledgerApp.getWalletAddress(multisigPolicy, policyHmac, 0, 0, true);
  console.log(
    `[Ledger][${bitcoinNetworkName}]Taproot Multisig Wallet Address From Ledger: ${multisigAddressFromLedger}`
  );

  // ==> Recreate Multisig Address to retrieve script
  const multiLeafWallet = p2tr_ns(2, [
    bip32.fromBase58(externalExtendedPublicKey).derivePath('0/0').publicKey,
    bip32.fromBase58(ledgerExtendedPublicKey).derivePath('0/0').publicKey,
  ]);

  const multisigTransaction = p2tr(
    bip32.fromBase58(unspendableExtendedPublicKey).derivePath('0/0').publicKey,
    multiLeafWallet,
    testnet
  );

  const multisigAddress = multisigTransaction.address;
  console.log(`[Ledger][${bitcoinNetworkName}] Recreated Multisig Address: ${multisigAddress}`);
}

export async function testLedger() {
  Transport.default
    .create()
    .then((transport) => main(transport))
    .catch(console.error);
}
