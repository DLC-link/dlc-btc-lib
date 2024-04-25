/** @format */

import { BitGoAPI } from '@bitgo/sdk-api';
import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
import { CoinConstructor, EnvironmentName, Wallet } from '@bitgo/sdk-core';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

import dotenv from 'dotenv';
import {
  createFundingTransactionInfo,
  createMultisigTransaction,
  derivePublicKeyFromMasterPublicKey,
  getAddress,
  getFeeRecipientAddress,
  getMultisigNativeSegwitAddress,
  getMultisigTaprootTransaction,
  getPublicKeyFromTaprootAddress,
  getTaprootAddress,
  getUTXOs,
} from './bitcoin-functions.js';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';

dotenv.config();

interface BitGoAddress {
  id: string;
  address: string;
  chain: number;
  index: number;
  coin: string;
  wallet: string;
  label: string;
  coinSpecific: Record<string, unknown>;
}

export const TARGET_NATIVE_SEGWIT_MULTISIG_PUBLICKEYS = [
  '0299edd7076a15f848a969b1ddbb5f89bc03bc272825e5a7c195ad4e14df2aa22a',
  '02c60d785bb90f86e928af586327570d64ebb8ea5b1d8f588afe8dbf999c859400',
  '021c10ce56ed56cc1cf12c04c75e1fa6ba973b8666e5c570b42af063708ae7abea',
];

export const TARGET_CHILD_NODES = [
  'xpub69AcSTtvBCuMep1Pz5S1ik3xYTPFLqh81NNf3zBgThLcdHKSuZDSxhMwc9A4b2DM8DDC78si5af1kvYcCGpiyXCKcD8zwdsd6mKQK6Y5iFZ',
  'xpub661MyMwAqRbcFq1F9XgMepGcNmBQgeA3Ue7XhvJ4xtZ9u8iDR6uMNbGZLHzF9Xy7aR9ALbLdWPCngzUue6VtDFFv9aHzPkw7iUhHuTYMNSN',
];

const TESTNET_FEE_PUBLIC_KEY = '03c9fc819e3c26ec4a58639add07f6372e810513f5d3d7374c25c65fdf1aefe4c5';
const TESTNET_ATTESTOR_PUBLIC_KEY = '4caaf4bb366239b0a8b7a5e5a44d043b5f66ae7364895317af8847ac6fadbd2b';

const TEST_VAULT_UUID = '0xcf5f227dd384a590362b417153876d9d22b31b2ed1e22065e270b82437cf1880';

const TARGET_NATIVE_SEGWIT_MULTISIG_ADDRESS = 'tb1q3ekr0u3s6clpag3tzaqk23f6edltxq3xl00hq8fjgugq5ds87jqsza5k55';

const DERIVATION_PATH_NATIVE_SEGWIT_FROM_MASTER = `m/0/0/20/`;
const DERIVATION_PATH_NATIVE_SEGWIT_FROM_CHILD = `0/0/20/`;

const DERIVATION_PATH_TAPROOT_FROM_MASTER = `m/0/0/30/`;
const DERIVATION_PATH_TAPROOT_FROM_CHILD = `0/0/30/`;

function findBitGoAddress(bitGoAddresses: BitGoAddress[], targetAddress: string): BitGoAddress {
  const bitGoAddress = bitGoAddresses.find((address) => address.address === targetAddress);
  if (!bitGoAddress) {
    throw new Error(`Address ${targetAddress} not found.`);
  }
  return bitGoAddress;
}

async function createTaprootAddress(bitGoWallet: Wallet) {
  try {
    const taprootAddress = await bitGoWallet.createAddress({
      chain: 30,
      label: 'Taproot Address 1',
    });
    console.log(`Created Native Segwit Address: ${JSON.stringify(taprootAddress, null, 2)}`);
    console.log(`Created Taproot Address: ${taprootAddress.address}`);
  } catch (error) {
    throw new Error(`Error while creating Taproot address: ${error}`);
  }
}

async function createNativeSegwitAddress(bitGoWallet: Wallet) {
  try {
    const nativeSegwitAddress = await bitGoWallet.createAddress({
      chain: 20,
      label: 'Native Segwit Address 1',
    });
    console.log(`Created Native Segwit Address: ${JSON.stringify(nativeSegwitAddress, null, 2)}`);
    console.log(`Created Native Segwit Address: ${nativeSegwitAddress.address}`);
  } catch (error) {
    throw new Error(`Error while creating Native Segwit address: ${error}`);
  }
}

async function getBitGoDetails() {
  const {
    BITCOIN_NETWORK,
    BITGO_ACCESS_TOKEN,
    BITGO_WALLET_ID,
    BITGO_NATIVE_SEGWIT_ADDRESS,
    BITGO_TAPROOT_ADDRESS,
    USER_XPUB,
    BACKUP_XPUB,
    BITGO_XPUB,
  } = process.env;

  if (
    !BITCOIN_NETWORK ||
    !BITGO_ACCESS_TOKEN ||
    !BITGO_WALLET_ID ||
    !BITGO_NATIVE_SEGWIT_ADDRESS ||
    !BITGO_TAPROOT_ADDRESS ||
    !USER_XPUB ||
    !BACKUP_XPUB ||
    !BITGO_XPUB
  ) {
    throw new Error('Please provide all the required Environment Variables.');
  }
  let environmentName: EnvironmentName;
  let coinType: string;
  let coinInstance: CoinConstructor;
  let bitcoinNetwork: Network;

  switch (BITCOIN_NETWORK) {
    case 'bitcoin':
      environmentName = 'prod';
      coinType = 'btc';
      coinInstance = Btc.createInstance;
      bitcoinNetwork = bitcoin;
      break;
    case 'testnet':
      environmentName = 'test';
      coinType = 'tbtc';
      coinInstance = Tbtc.createInstance;
      bitcoinNetwork = testnet;
      break;
    default:
      throw new Error('Invalid BITCOIN_NETWORK Value. Please provide either "bitcoin" or "testnet".');
  }

  let bitGoAPI: BitGoAPI;
  try {
    bitGoAPI = new BitGoAPI({ accessToken: BITGO_ACCESS_TOKEN, env: environmentName });
  } catch (error) {
    throw new Error(`Error while initializing BitGo API: ${error}`);
  }

  bitGoAPI.register(coinType, coinInstance);

  let bitGoWallet: Wallet;
  try {
    bitGoWallet = await bitGoAPI.coin(coinType).wallets().getWallet({ id: BITGO_WALLET_ID });
  } catch (error) {
    throw new Error(`Error while retrieving BitGo wallet: ${error}`);
  }

  const bitGoKeyChain = await bitGoAPI.coin(coinType).keychains().getKeysForSigning({ wallet: bitGoWallet });

  return {
    bitGoAPI,
    bitGoWallet,
    bitGoKeyChain,
    nativeSegwitAddress: BITGO_NATIVE_SEGWIT_ADDRESS,
    taprootAddress: BITGO_TAPROOT_ADDRESS,
    userXPUB: USER_XPUB,
    backupXPUB: BACKUP_XPUB,
    bitGoXPUB: BITGO_XPUB,
    bitcoinNetwork,
  };
}

async function main() {
  try {
    const {
      bitGoAPI,
      bitGoWallet,
      bitGoKeyChain,
      nativeSegwitAddress,
      taprootAddress,
      userXPUB,
      backupXPUB,
      bitGoXPUB,
      bitcoinNetwork,
    } = await getBitGoDetails();

    console.log(`Current Balance: ${bitGoWallet.balance()}`);

    const { addresses: bitGoAddresses } = await bitGoWallet.addresses();
    const bitGoNativeSegwitAddress = findBitGoAddress(bitGoAddresses, nativeSegwitAddress);
    const bitGoTaprootAddress = findBitGoAddress(bitGoAddresses, taprootAddress);

    const userDerivedNativeSegwitPublicKey = derivePublicKeyFromMasterPublicKey(
      userXPUB,
      DERIVATION_PATH_NATIVE_SEGWIT_FROM_MASTER,
      bitGoNativeSegwitAddress.index.toString()
    );

    console.log('userDerivedNativeSegwitPublicKey', userDerivedNativeSegwitPublicKey);

    const bitGoDerivedNativeSegwitPublicKey = derivePublicKeyFromMasterPublicKey(
      bitGoXPUB,
      DERIVATION_PATH_NATIVE_SEGWIT_FROM_MASTER,
      bitGoNativeSegwitAddress.index.toString()
    );

    console.log('bitGoderivedPublicKey', bitGoDerivedNativeSegwitPublicKey);

    // Backup XPUB is a child of the user XPUB, so we use the child derivation path
    const backupDerivedNativeSegwitPublicKey = derivePublicKeyFromMasterPublicKey(
      backupXPUB,
      DERIVATION_PATH_NATIVE_SEGWIT_FROM_CHILD,
      bitGoNativeSegwitAddress.index.toString()
    );

    console.log('backupDerivedPublicKey', backupDerivedNativeSegwitPublicKey);

    // To recreate the multisig address created by BitGo, we need to use the public keys in the same order
    const nativeSegwitPublicKeys = [
      userDerivedNativeSegwitPublicKey,
      backupDerivedNativeSegwitPublicKey,
      bitGoDerivedNativeSegwitPublicKey,
    ];

    const multisigAddress = getMultisigNativeSegwitAddress(nativeSegwitPublicKeys, bitcoinNetwork);

    if (multisigAddress !== TARGET_NATIVE_SEGWIT_MULTISIG_ADDRESS) {
      throw new Error('Multisig Address does not match the target address.');
    }

    const userDerivedTaprootPublicKey = derivePublicKeyFromMasterPublicKey(
      userXPUB,
      DERIVATION_PATH_TAPROOT_FROM_MASTER,
      bitGoTaprootAddress.index.toString()
    );

    console.log('userDerivedTaprootPublicKey', userDerivedTaprootPublicKey);

    const bitGoDerivedTaprootPublicKey = derivePublicKeyFromMasterPublicKey(
      bitGoXPUB,
      DERIVATION_PATH_TAPROOT_FROM_MASTER,
      bitGoTaprootAddress.index.toString()
    );

    console.log('bitGoDerivedTaprootPublicKey', bitGoDerivedTaprootPublicKey);

    // Backup XPUB is a child of the user XPUB, so we use the child derivation path
    const backupDerivedTaprootPublicKey = derivePublicKeyFromMasterPublicKey(
      backupXPUB,
      DERIVATION_PATH_TAPROOT_FROM_CHILD,
      bitGoTaprootAddress.index.toString()
    );

    console.log('backupDerivedTaprootPublicKey', backupDerivedTaprootPublicKey);

    // To recreate the multisig address created by BitGo, we need to use the public keys in the same order
    const taprootPublicKeys = [
      userDerivedTaprootPublicKey,
      bitGoDerivedTaprootPublicKey,
      backupDerivedTaprootPublicKey,
    ];

    // Create a Taproot Multisig Address from the User's, BitGo's and Backup's Public Keys
    const taprootMultisig = getMultisigTaprootTransaction(taprootPublicKeys, bitcoinNetwork);

    // Create a Taproot Multisig Transaction from the Taproot Multisig Address and the Attestor's Group Public Key
    const multisigTransaction = await createMultisigTransaction(
      taprootMultisig.tweakedPubkey,
      Buffer.from(TESTNET_ATTESTOR_PUBLIC_KEY, 'hex'),
      TEST_VAULT_UUID,
      bitcoinNetwork
    );

    if (!multisigTransaction.address) throw new Error('Error while creating Multisig Transaction.');

    // Get the Fee Recipient Address from the Fee Recipient's Public Key
    const feeRecipientAddress = getFeeRecipientAddress(TESTNET_FEE_PUBLIC_KEY, bitcoinNetwork);

    // Create an array of Recipients for the Funding Transaction
    const fundingTransactionRecipients = createFundingTransactionInfo(
      0.001,
      multisigTransaction.address,
      feeRecipientAddress,
      0.01
    );

    // Create a Prebuild Transaction from the Recipients
    const preBuild = await bitGoWallet.prebuildTransaction({ recipients: fundingTransactionRecipients });

    // Sign the Prebuild Transaction with the BitGo Keychain
    const signFundingTransactionResponse = await bitGoWallet.signTransaction({
      txPrebuild: preBuild,
      keychain: bitGoKeyChain[0],
      walletPassphrase: '7B%w^F%dWPFRE4',
    });

    await bitGoWallet.prebuildTransaction({});

    console.log('Funding Transaction Signing Response', signFundingTransactionResponse);
  } catch (error) {
    console.error(`Error while running BitGoAPI flow: ${error}`);
  }
}

main();
