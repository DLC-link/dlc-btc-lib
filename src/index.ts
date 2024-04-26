/** @format */

import { BitGoAPI } from '@bitgo/sdk-api';
import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
import { CoinConstructor, EnvironmentName, FullySignedTransaction, Wallet } from '@bitgo/sdk-core';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

import { Transaction } from '@scure/btc-signer';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';
import dotenv from 'dotenv';
import {
  broadcastTransaction,
  createClosingTransaction,
  createFundingTransaction,
  createMultisigTransaction,
  getFeeRecipientAddress,
  getUTXOs,
} from './bitcoin-functions.js';
import {
  TEST_ATTESTOR_PUBLIC_KEY,
  TEST_BITCOIN_AMOUNT,
  TEST_FEE_AMOUNT,
  TEST_FEE_PUBLIC_KEY,
  TEST_FEE_RATE,
  TEST_VAULT_UUID,
} from './constants.js';
import { BitGoAddress } from './models.js';
import { getNativeSegwitPublicKeys, getTaprootMultisigScript, getTaprootPublicKeys } from './payment-functions.js';
import { bitcoinToSats } from './utilities.js';

dotenv.config();

function findBitGoAddress(bitGoAddresses: BitGoAddress[], targetAddress: string): BitGoAddress {
  const bitGoAddress = bitGoAddresses.find((address) => address.address === targetAddress);
  if (!bitGoAddress) {
    throw new Error(`Address ${targetAddress} not found.`);
  }
  return bitGoAddress;
}

async function createTaprootAddress(bitGoWallet: Wallet, label: string) {
  try {
    const taprootAddress = await bitGoWallet.createAddress({
      chain: 30,
      label,
    });
    console.log(`Created Taproot Address: ${JSON.stringify(taprootAddress, null, 2)}`);
  } catch (error) {
    throw new Error(`Error while creating Taproot address: ${error}`);
  }
}

async function createNativeSegwitAddress(bitGoWallet: Wallet, label: string) {
  try {
    const nativeSegwitAddress = await bitGoWallet.createAddress({
      chain: 20,
      label,
    });
    console.log(`Created Native Segwit Address: ${JSON.stringify(nativeSegwitAddress, null, 2)}`);
  } catch (error) {
    throw new Error(`Error while creating Native Segwit address: ${error}`);
  }
}

async function getBitGoDetails() {
  const {
    BITCOIN_NETWORK,
    BITGO_ACCESS_TOKEN,
    BITGO_WALLET_PASSPHRASE,
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
    !BITGO_WALLET_PASSPHRASE ||
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
    bitGoWalletPassphrase: BITGO_WALLET_PASSPHRASE,
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
      bitGoWalletPassphrase,
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

    // this returns the public keys of the user, backup and bitgo for the native segwit multisig address
    const nativeSegwitPublicKeys = getNativeSegwitPublicKeys(
      bitGoNativeSegwitAddress,
      userXPUB,
      backupXPUB,
      bitGoXPUB,
      bitcoinNetwork
    );

    // this returns the public keys of the user, backup and bitgo for a new taproot multisig address
    const taprootPublicKeys = getTaprootPublicKeys(bitGoTaprootAddress, userXPUB, backupXPUB, bitGoXPUB);

    // not sure if this is the correct way to create a taproot multisig address from the public keys
    const taprootMultisig = getTaprootMultisigScript(taprootPublicKeys, bitcoinNetwork);

    // this creates a multisig transaction using the user's taproot public key and the attestor group's public key
    const multisigTransaction = await createMultisigTransaction(
      taprootMultisig.tweakedPubkey, // this is the user's taproot public key
      Buffer.from(TEST_ATTESTOR_PUBLIC_KEY, 'hex'),
      TEST_VAULT_UUID,
      bitcoinNetwork
    );

    if (!multisigTransaction.address) throw new Error('Error while creating Multisig Transaction.');

    // ### ORIGINAL FUNDING TRANSACTION FLOW ###

    // #1 Create a Funding Transaction to fund the Multisig Transaction
    // const fundingTransaction = await createFundingTransaction(
    //   TEST_BITCOIN_AMOUNT,
    //   bitcoinNetwork,
    //   multisigTransaction.address,
    //   bitGoNativeSegwitAddress.address,
    //   nativeSegwitPublicKeys,
    //   TEST_FEE_RATE,
    //   TEST_FEE_PUBLIC_KEY,
    //   TEST_FEE_AMOUNT
    // );

    // #2 Sign the Funding Transaction

    // #3 Finalize the Funding Transaction
    // const transaction = Transaction.fromPSBT(fundingTransaction);
    // transaction.finalize();

    // #4 Broadcast the Funding Transaction
    // const broadcastResponse = await broadcastTransaction(bytesToHex(fundingTransaction));

    // ### BITGO API FLOW ###

    // #1 Create an Array of Recipients for the Transaction
    const feeRecipientAddress = getFeeRecipientAddress(TEST_FEE_PUBLIC_KEY, bitcoinNetwork);
    const recipients = [
      { amount: bitcoinToSats(TEST_BITCOIN_AMOUNT), address: multisigTransaction.address },
      { amount: bitcoinToSats(TEST_BITCOIN_AMOUNT * TEST_FEE_AMOUNT), address: feeRecipientAddress },
    ];

    // #2 Prebuild the Transaction
    const transactionPrebuild = await bitGoWallet.prebuildTransaction({
      recipients: recipients,
      walletPassphrase: bitGoWalletPassphrase,
    });

    // #3 Sign the Transaction
    const signedTransaction = await bitGoWallet.signTransaction({
      txPrebuild: transactionPrebuild,
      keychain: bitGoKeyChain[0],
      walletPassphrase: bitGoWalletPassphrase,
    });

    const FullySignedTransaction = signedTransaction as FullySignedTransaction;

    // #4 Submit the Transaction
    const submitResponse = await bitGoWallet.submitTransaction({ txHex: FullySignedTransaction.txHex });

    // ### ORIGINAL CLOSING TRANSACTION FLOW ###

    // #1 Create a Closing Transaction
    const closingTransaction = await createClosingTransaction(
      TEST_BITCOIN_AMOUNT,
      bitcoinNetwork,
      'fundingTransactionID', // this is the ID of the funding transaction
      multisigTransaction,
      bitGoNativeSegwitAddress.address,
      TEST_FEE_RATE,
      TEST_FEE_PUBLIC_KEY,
      TEST_FEE_AMOUNT
    );

    // #2 Sign the Closing Transaction

    // #3 Send the Closing Transaction PSBT to the Attestor Group

    // ### BITGO API FLOW ###

    // #1 Prebuild the Transaction
    const closingTransactionPreBuild = await bitGoWallet.prebuildTransaction({
      recipients: [
        { amount: bitcoinToSats(TEST_BITCOIN_AMOUNT), address: bitGoNativeSegwitAddress.address },
        { amount: bitcoinToSats(TEST_BITCOIN_AMOUNT * TEST_FEE_AMOUNT), address: feeRecipientAddress },
      ],
      unspents: ['fundingTransactionID:index'], // this is how the unspent can be referenced in the BitGo API
      walletPassphrase: bitGoWalletPassphrase,
    });

    // #2 Sign the Transaction
    const signedClosingTransaction = await bitGoWallet.signTransaction({
      txPrebuild: transactionPrebuild,
      keychain: bitGoKeyChain[0],
      walletPassphrase: bitGoWalletPassphrase,
    });

    // #3 Send the Closing Transaction PSBT to the Attestor Group
  } catch (error) {
    console.error(`Error while running BitGoAPI flow: ${error}`);
  }
}

main();
