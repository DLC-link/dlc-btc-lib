/** @format */

import Transport from '@ledgerhq/hw-transport-node-hid';
import { Network, bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';
import { AppClient } from 'ledger-bitcoin';
import {
  NATIVE_SEGWIT_DERIVATION_PATH,
  TAPROOT_DERIVATION_PATH,
  TEST_BITCOIN_AMOUNT,
  TEST_FEE_AMOUNT,
  TEST_FEE_PUBLIC_KEY,
  TEST_FEE_RATE,
} from './constants.js';
import { getNativeSegwitAccount, getTaprootMultisigAccount } from './ledger-functions.js';
import { handleClosingTransaction, handleFundingTransaction } from './psbt-functions.js';
import { BitcoinNetworkName } from './models/bitcoin-models.js';

function getBitcoinNetwork(): [BitcoinNetworkName, Network, string] {
  const { BITCOIN_NETWORK } = process.env;

  switch (BITCOIN_NETWORK) {
    case 'Mainnet':
      return ['Mainnet', bitcoin, "0'"];
    case 'Testnet':
      return ['Testnet', testnet, "1'"];
    default:
      throw new Error('Invalid Bitcoin Network');
  }
}

export async function runLedger() {
  try {
    // ==> Get Bitcoin Network
    const [bitcoinNetworkName, bitcoinNetwork, bitcoinNetworkIndex] = getBitcoinNetwork();
    const rootTaprootDerivationPath = `${TAPROOT_DERIVATION_PATH}/${bitcoinNetworkIndex}/0'`;
    const rootNativeSegwitDerivationPath = `${NATIVE_SEGWIT_DERIVATION_PATH}/${bitcoinNetworkIndex}/0'`;

    // ==> Get Transport from Ledger
    const transport = await Transport.default.create();

    // ==> Create a new instance of the AppClient
    const ledgerApp = new AppClient(transport);

    // ==> Get Ledger Master Fingerprint
    const fpr = await ledgerApp.getMasterFingerprint();

    // ==> Get Native Segwit Account
    const { lednerNativeSegwitAccountPolicy, nativeSegwitAddress, nativeSegwitDerivedPublicKey, nativeSegwitPayment } =
      await getNativeSegwitAccount(ledgerApp, fpr, bitcoinNetwork, bitcoinNetworkName, rootNativeSegwitDerivationPath);

    // ==> Get Taproot Multisig Account
    const {
      ledgerTaprootMultisigAccountPolicy,
      ledgerTaprootMultisigPolicyHMac,
      taprootMultisigAddress,
      taprootDerivedPublicKey,
      taprootMultisigPayment,
    } = await getTaprootMultisigAccount(ledgerApp, fpr, bitcoinNetwork, bitcoinNetworkName, rootTaprootDerivationPath);

    // ==> Handle Funding Transaction
    const fundingTransaction = await handleFundingTransaction(
      ledgerApp,
      bitcoinNetwork,
      bitcoinNetworkName,
      TEST_BITCOIN_AMOUNT,
      fpr,
      taprootMultisigPayment,
      nativeSegwitDerivedPublicKey,
      nativeSegwitPayment,
      lednerNativeSegwitAccountPolicy,
      TEST_FEE_RATE,
      TEST_FEE_PUBLIC_KEY,
      TEST_FEE_AMOUNT
    );

    // ==> Handle Closing Transaction
    const closingTransaction = await handleClosingTransaction(
      ledgerApp,
      bitcoinNetwork,
      bitcoinNetworkName,
      TEST_BITCOIN_AMOUNT,
      fpr,
      fundingTransaction,
      taprootMultisigPayment,
      taprootDerivedPublicKey,
      ledgerTaprootMultisigAccountPolicy,
      ledgerTaprootMultisigPolicyHMac,
      nativeSegwitPayment,
      TEST_FEE_RATE,
      TEST_FEE_PUBLIC_KEY,
      TEST_FEE_AMOUNT
    );

    ledgerApp.transport.close();
  } catch (error) {
    throw new Error(`Error running PSBT signing flow with Ledger: ${error}`);
  }
}
