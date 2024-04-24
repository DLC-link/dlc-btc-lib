/** @format */

import { BitGoAPI } from '@bitgo/sdk-api';
import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
import { CoinConstructor, EnvironmentName, Wallet } from '@bitgo/sdk-core';

import dotenv from 'dotenv';
import {
  deriveChildNodeFromMasterPublicKey,
  derivePublicKeyFromMasterPublicKey,
  getAddress,
  getInnerPublicKey,
  getMultisigNativeSegwitAddress,
  getPublicKeyFromTaprootAddress,
  getTaprootAddress,
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
  const { BITCOIN_NETWORK, BITGO_ACCESS_TOKEN, BITGO_WALLET_ID, BITGO_NATIVE_SEGWIT_ADDRESS, BITGO_TAPROOT_ADDRESS } =
    process.env;

  if (
    !BITCOIN_NETWORK ||
    !BITGO_ACCESS_TOKEN ||
    !BITGO_WALLET_ID ||
    !BITGO_NATIVE_SEGWIT_ADDRESS ||
    !BITGO_TAPROOT_ADDRESS
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

  const bitGoKeyChain = await bitGoAPI.coin(coinType).keychains().list();

  return {
    bitGoAPI,
    bitGoWallet,
    bitGoKeyChain,
    nativeSegwitAddress: BITGO_NATIVE_SEGWIT_ADDRESS,
    taprootAddress: BITGO_TAPROOT_ADDRESS,
    bitcoinNetwork,
  };
}

async function main() {
  try {
    const { bitGoAPI, bitGoWallet, bitGoKeyChain, nativeSegwitAddress, taprootAddress, bitcoinNetwork } =
      await getBitGoDetails();

    console.log(`Current BitGo Wallet Addresses: ${JSON.stringify(await bitGoWallet.addresses(), null, 2)}`);
    console.log(`Current Balance: ${bitGoWallet.balance()}`);

    const builtMultisigAddress = getMultisigNativeSegwitAddress(
      TARGET_NATIVE_SEGWIT_MULTISIG_PUBLICKEYS,
      bitcoinNetwork
    );

    console.log(
      'Target Multisig Address is equal to Built Multisig Address:',
      builtMultisigAddress === TARGET_NATIVE_SEGWIT_MULTISIG_ADDRESS
    );
    const derivationPathNativeSegwitFromMaster = `m/0/0/20/`;

    console.log('Checking User Public Key Derivation from Master Public Key:');
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(async (index) => {
      const derivedPublicKey = derivePublicKeyFromMasterPublicKey(
        'xpub661MyMwAqRbcFzH9LyJ7e5dYdUmECDf8CyE6GRaFZqe1h9YAKvHAGp519ES3ftEovPH7G368mdVJstvWkjnSrYMtYDyyMKRHoHKaLL9op7r',
        derivationPathNativeSegwitFromMaster,
        index.toString()
      );
    });

    console.log('Checking BitGo Public Key Derivation from Master Public Key:');
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(async (index) => {
      const derivedPublicKey = derivePublicKeyFromMasterPublicKey(
        'xpub661MyMwAqRbcFq1F9XgMepGcNmBQgeA3Ue7XhvJ4xtZ9u8iDR6uMNbGZLHzF9Xy7aR9ALbLdWPCngzUue6VtDFFv9aHzPkw7iUhHuTYMNSN',
        derivationPathNativeSegwitFromMaster,
        index.toString()
      );
    });

    const derivationPathNativeSegwitFromChild = `0/0/20/`;

    console.log('Checking Backup Public Key Derivation from Master Public Key:');
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(async (index) => {
      const derivedPublicKey = derivePublicKeyFromMasterPublicKey(
        'xpub69AcSTtvBCuMep1Pz5S1ik3xYTPFLqh81NNf3zBgThLcdHKSuZDSxhMwc9A4b2DM8DDC78si5af1kvYcCGpiyXCKcD8zwdsd6mKQK6Y5iFZ',
        derivationPathNativeSegwitFromChild,
        index.toString()
      );
    });

    // const { addresses: bitGoAddresses } = await bitGoWallet.addresses();
    // const bitGoNativeSegwitAddress = findBitGoAddress(bitGoAddresses, nativeSegwitAddress);
    // const bitGoTaprootAddress = findBitGoAddress(bitGoAddresses, taprootAddress);

    // if (!nativeSegwitAddress || !taprootAddress) {
    //   throw new Error('Error while retrieving Bitcoin addresses.');
    // }

    // const pubkeys = [
    //   '03771aeecc5a64c11310ae693ee95d93c8dbedb78ecc3cc3ee0a171a2c775ab49f',
    //   '0352e00b1b2ab21bf2de00aa0ffd8c880b0f4b2d04fbf97c6851f891d6a86270f8',
    //   '025417911ca45cfd4c2e0386dc980389f36cbd8ecf56fa779288277c274f9d9ec9',
    // ];

    // try {
    //   await bitGoWallet.send({
    //     address: bitGoNativeSegwitAddress.address,
    //     amount: 10000,
    //     walletPassphrase: 'p^LjPVxv5^A#&L',
    //   });
    // } catch (error) {
    //   console.error(`Error while sending Bitcoin: ${error}`);
    // }
    // console.log(`Native Segwit Address: ${bitGoNativeSegwitAddress.address}`);
    // console.log(`Taproot Address: ${bitGoTaprootAddress.address}`);
    // console.log('wallet Keychain', bitGoKeyChain);

    // [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(async (index) => {
    //   const derived = derivePublicKeyFromMasterPublicKey(
    //     'xpub661MyMwAqRbcFnngPM5qrSwRrEQevBBSnMK1a4KRLvQ2gKipqHYKNTQedezdfFWz2Q8XaaQuDaPANgpEXzoqjqHHWkVJEoQrHEfG5Un3UK4',
    //     index.toString(),
    //     bitcoinNetwork
    //   );

    //   console.log(`Derived Public Key: ${derived}`);
    // });
    // getTaprootAddress('f9e46ad81e502f328916a3deeaf2f2208b1e8901040fd1449d3c0f3027da0511', bitcoinNetwork);
    // const data = await getPublicKeyFromTaprootAddress(bitGoTaprootAddress.address, bitcoinNetwork);

    // console.log(`UTXOs: ${JSON.stringify(utxos, null, 2)}`);
  } catch (error) {
    console.error(`Error while running BitGoAPI flow: ${error}`);
  }
}

main();
