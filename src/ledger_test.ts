/** @format */

import { Network, bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';

import {
  NATIVE_SEGWIT_DERIVATION_PATH,
  TAPROOT_DERIVATION_PATH,
  TEST_BITCOIN_AMOUNT,
  TEST_FEE_AMOUNT,
  TEST_FEE_PUBLIC_KEY,
  TEST_FEE_RATE,
} from './constants.js';
import {
  LEDGER_APPS_MAP,
  getLedgerAddressIndexAndDerivationPath,
  getLedgerApp,
  getNativeSegwitAccount,
  getTaprootMultisigAccount,
} from './ledger-functions.js';
import { BitcoinNetworkName } from './models/bitcoin-models.js';
import { handleClosingTransaction, handleFundingTransaction } from './psbt-functions.js';

function getBitcoinNetwork(): [BitcoinNetworkName, Network, string, string] {
  const { BITCOIN_NETWORK } = process.env;

  switch (BITCOIN_NETWORK) {
    case 'Mainnet':
      return ['Mainnet', bitcoin, "0'", LEDGER_APPS_MAP.BITCOIN_MAINNET];
    case 'Testnet':
      return ['Testnet', testnet, "1'", LEDGER_APPS_MAP.BITCOIN_TESTNET];
    default:
      throw new Error('Invalid Bitcoin Network');
  }
}

export async function runLedger() {
  try {
    // ==> Get Bitcoin Network
    const [bitcoinNetworkName, bitcoinNetwork, bitcoinNetworkIndex, ledgerAppName] = getBitcoinNetwork();

    const rootTaprootDerivationPath = `${TAPROOT_DERIVATION_PATH}/${bitcoinNetworkIndex}/0'`;

    // ==> Open Ledger App
    const ledgerApp = await getLedgerApp(ledgerAppName);

    if (!ledgerApp) {
      throw new Error(`[Ledger][${bitcoinNetworkName}] Could not open Ledger ${ledgerAppName} App`);
    }

    // ==> Get Ledger Master Fingerprint
    const fpr = await ledgerApp.getMasterFingerprint();

    const { addressIndex: nativeSegwitAddressIndex, rootDerivationPath: rootNativeSegwitDerivationPath } =
      await getLedgerAddressIndexAndDerivationPath(
        ledgerApp,
        fpr,
        bitcoinNetworkName,
        bitcoinNetworkIndex,
        'wpkh',
        NATIVE_SEGWIT_DERIVATION_PATH
      );

    console.log(
      `[Ledger][${bitcoinNetworkName}] Selected Native Segwit Address Index: ${[nativeSegwitAddressIndex][0]}`
    );

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
    console.log(`[Ledger][${bitcoinNetworkName}] Signed Funding and Closing Transaction`);

    ledgerApp.transport.close();
  } catch (error) {
    throw new Error(`Error running PSBT signing flow with Ledger: ${error}`);
  }
}
