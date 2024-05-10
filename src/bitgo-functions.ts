/** @format */

// /** @format */

// import { CoinConstructor, EnvironmentName, Wallet } from '@bitgo/sdk-core';
// import { BitGoAddress } from './models/bitgo-models.js';
// import { bitcoinToSats } from './utilities.js';
// import { Network } from 'bitcoinjs-lib';
// import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
// import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';
// import { BitGoAPI } from '@bitgo/sdk-api';

// function findBitGoAddress(bitGoAddresses: BitGoAddress[], targetAddress: string): BitGoAddress {
//   const bitGoAddress = bitGoAddresses.find((address) => address.address === targetAddress);
//   if (!bitGoAddress) {
//     throw new Error(`Address ${targetAddress} not found.`);
//   }
//   return bitGoAddress;
// }

// async function createTaprootAddress(bitGoWallet: Wallet, label: string) {
//   try {
//     const taprootAddress = await bitGoWallet.createAddress({
//       chain: 30,
//       label,
//     });
//     console.log(`Created Taproot Address: ${JSON.stringify(taprootAddress, null, 2)}`);
//   } catch (error) {
//     throw new Error(`Error while creating Taproot address: ${error}`);
//   }
// }

// async function createNativeSegwitAddress(bitGoWallet: Wallet, label: string) {
//   try {
//     const nativeSegwitAddress = await bitGoWallet.createAddress({
//       chain: 20,
//       label,
//     });
//     console.log(`Created Native Segwit Address: ${JSON.stringify(nativeSegwitAddress, null, 2)}`);
//   } catch (error) {
//     throw new Error(`Error while creating Native Segwit address: ${error}`);
//   }
// }

// async function createMultisigWallet() {
//   const {
//     BITCOIN_NETWORK,
//     BITGO_ACCESS_TOKEN,
//     BITGO_WALLET_PASSPHRASE,
//     BITGO_WALLET_ID,
//     BITGO_NATIVE_SEGWIT_ADDRESS,
//     BITGO_TAPROOT_ADDRESS,
//     USER_XPUB,
//     BACKUP_XPUB,
//     BITGO_XPUB,
//   } = process.env;

//   if (
//     !BITCOIN_NETWORK ||
//     !BITGO_ACCESS_TOKEN ||
//     !BITGO_WALLET_PASSPHRASE ||
//     !BITGO_WALLET_ID ||
//     !BITGO_NATIVE_SEGWIT_ADDRESS ||
//     !BITGO_TAPROOT_ADDRESS ||
//     !USER_XPUB ||
//     !BACKUP_XPUB ||
//     !BITGO_XPUB
//   ) {
//     throw new Error('Please provide all the required Environment Variables.');
//   }

//   let environmentName: EnvironmentName;
//   let coinType: string;
//   let coinInstance: CoinConstructor;
//   let bitcoinNetwork: Network;

//   switch (BITCOIN_NETWORK) {
//     case 'bitcoin':
//       environmentName = 'prod';
//       coinType = 'btc';
//       coinInstance = Btc.createInstance;
//       bitcoinNetwork = bitcoin;
//       break;
//     case 'testnet':
//       environmentName = 'test';
//       coinType = 'tbtc';
//       coinInstance = Tbtc.createInstance;
//       bitcoinNetwork = testnet;
//       break;
//     default:
//       throw new Error('Invalid BITCOIN_NETWORK Value. Please provide either "bitcoin" or "testnet".');
//   }

//   const attestorGroupXPublicKey = 'xpub43f9a14c790c0b86ce78bec919e96725e56aee8e0a0fdd8138aa7b351930b3c1';

//   let bitGoAPI: BitGoAPI;
//   try {
//     bitGoAPI = new BitGoAPI({ accessToken: BITGO_ACCESS_TOKEN, env: environmentName });
//   } catch (error) {
//     throw new Error(`Error while initializing BitGo API: ${error}`);
//   }

//   bitGoAPI.coin(coinType).wallets().generateWallet({ label: 'Test Wallet' });

//   bitGoAPI.register(coinType, coinInstance);
// }

// async function getBitGoDetails() {
//   const {
//     BITCOIN_NETWORK,
//     BITGO_ACCESS_TOKEN,
//     BITGO_WALLET_PASSPHRASE,
//     BITGO_WALLET_ID,
//     BITGO_NATIVE_SEGWIT_ADDRESS,
//     BITGO_TAPROOT_ADDRESS,
//     USER_XPUB,
//     BACKUP_XPUB,
//     BITGO_XPUB,
//   } = process.env;

//   if (
//     !BITCOIN_NETWORK ||
//     !BITGO_ACCESS_TOKEN ||
//     !BITGO_WALLET_PASSPHRASE ||
//     !BITGO_WALLET_ID ||
//     !BITGO_NATIVE_SEGWIT_ADDRESS ||
//     !BITGO_TAPROOT_ADDRESS ||
//     !USER_XPUB ||
//     !BACKUP_XPUB ||
//     !BITGO_XPUB
//   ) {
//     throw new Error('Please provide all the required Environment Variables.');
//   }

//   let environmentName: EnvironmentName;
//   let coinType: string;
//   let coinInstance: CoinConstructor;
//   let bitcoinNetwork: Network;

//   switch (BITCOIN_NETWORK) {
//     case 'bitcoin':
//       environmentName = 'prod';
//       coinType = 'btc';
//       coinInstance = Btc.createInstance;
//       bitcoinNetwork = bitcoin;
//       break;
//     case 'testnet':
//       environmentName = 'test';
//       coinType = 'tbtc';
//       coinInstance = Tbtc.createInstance;
//       bitcoinNetwork = testnet;
//       break;
//     default:
//       throw new Error('Invalid BITCOIN_NETWORK Value. Please provide either "bitcoin" or "testnet".');
//   }

//   let bitGoAPI: BitGoAPI;
//   try {
//     bitGoAPI = new BitGoAPI({ accessToken: BITGO_ACCESS_TOKEN, env: environmentName });
//   } catch (error) {
//     throw new Error(`Error while initializing BitGo API: ${error}`);
//   }

//   bitGoAPI.coin(coinType).wallets().generateWallet({ label: 'Test Wallet' });

//   bitGoAPI.register(coinType, coinInstance);

//   let bitGoWallet: Wallet;
//   try {
//     bitGoWallet = await bitGoAPI.coin(coinType).wallets().getWallet({ id: BITGO_WALLET_ID });
//   } catch (error) {
//     throw new Error(`Error while retrieving BitGo wallet: ${error}`);
//   }

//   const bitGoKeyChain = await bitGoAPI.coin(coinType).keychains().getKeysForSigning({ wallet: bitGoWallet });

//   return {
//     bitGoAPI,
//     bitGoWallet,
//     bitGoKeyChain,
//     bitGoWalletPassphrase: BITGO_WALLET_PASSPHRASE,
//     nativeSegwitAddress: BITGO_NATIVE_SEGWIT_ADDRESS,
//     taprootAddress: BITGO_TAPROOT_ADDRESS,
//     userXPUB: USER_XPUB,
//     backupXPUB: BACKUP_XPUB,
//     bitGoXPUB: BITGO_XPUB,
//     bitcoinNetwork,
//   };
// }

// /**
//  * Creates a Funding Transaction to fund the Multisig Transaction.
//  *
//  * @param bitcoinAmount - The amount of Bitcoin to fund the Transaction with.
//  * @param multisigAddress - The Multisig Address.
//  * @param feeRecipientAddress - The Fee Recipient's Address.
//  * @param feeBasisPoints - The Fee Basis Points.
//  * @returns The Funding Transaction Info.
//  */
// export function getFundingTransactionRecipients(
//   bitcoinAmount: number,
//   multisigAddress: string,
//   feeRecipientAddress: string,
//   feeBasisPoints: number
// ) {
//   const recipients = [
//     { amount: bitcoinToSats(bitcoinAmount), address: multisigAddress },
//     {
//       amount: bitcoinToSats(bitcoinAmount) * feeBasisPoints,
//       address: feeRecipientAddress,
//     },
//   ];

//   return recipients;
// }
