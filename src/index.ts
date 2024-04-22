/** @format */

import { BitGoAPI } from '@bitgo/sdk-api';
import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
import { CoinConstructor, EnvironmentName, Wallet } from '@bitgo/sdk-core';

import dotenv from 'dotenv';
import { findPublicKeyOfAddress } from './bitcoin-functions.js';
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
      label: 'Taproot Address',
    });
    console.log(`Created Taproot Address: ${taprootAddress.address}`);
  } catch (error) {
    throw new Error(`Error while creating Taproot address: ${error}`);
  }
}

async function createNativeSegwitAddress(bitGoWallet: Wallet) {
  try {
    const nativeSegwitAddress = await bitGoWallet.createAddress({
      chain: 20,
      label: 'Native Segwit Address',
    });
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
  } = process.env;

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
    bitGoWallet = await bitGoAPI
      .coin(coinType)
      .wallets()
      .getWallet({ id: BITGO_WALLET_ID });
  } catch (error) {
    throw new Error(`Error while retrieving BitGo wallet: ${error}`);
  }

  const bitGoKeyChain = await bitGoAPI
    .coin(coinType)
    .keychains()
    .list();

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
    const {
      bitGoAPI,
      bitGoWallet,
      bitGoKeyChain,
      nativeSegwitAddress,
      taprootAddress,
      bitcoinNetwork,
    } = await getBitGoDetails();

    console.log(`Current BitGo Wallet Addresses: ${JSON.stringify(await bitGoWallet.addresses(), null, 2)}`);
    console.log(`Current Balance: ${bitGoWallet.balance()}`);

    const { addresses: bitGoAddresses } = await bitGoWallet.addresses();
    const bitGoNativeSegwitAddress = findBitGoAddress(bitGoAddresses, nativeSegwitAddress);
    const bitGoTaprootAddress = findBitGoAddress(bitGoAddresses, taprootAddress);

    if (!nativeSegwitAddress || !taprootAddress) {
      throw new Error('Error while retrieving Bitcoin addresses.');
    }

    console.log(`Native Segwit Address: ${bitGoNativeSegwitAddress.address}`);
    console.log(`Taproot Address: ${bitGoTaprootAddress.address}`);
  } catch (error) {
    console.error(`Error while running BitGoAPI flow: ${error}`);
  }
}

main();
