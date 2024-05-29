/** @format */

import { bytesToHex } from '@noble/hashes/utils';
import { regtest } from 'bitcoinjs-lib/src/networks.js';
import dotenv from 'dotenv';
import { ethereumArbitrumSepolia } from './constants/ethereum-constants.js';
import { PrivateKeyDLCHandler } from './dlc-handlers/private-key-dlc-handler.js';
import { broadcastTransaction } from './functions/bitcoin-functions.js';
import { fetchEthereumDeploymentPlan } from './functions/ethereum-functions.js';
import { EthereumHandler } from './network-handlers/ethereum-handler.js';
import { AttestorHandler } from './query-handlers/attestor-handler.js';
import { shiftValue } from './utilities/index.js';

dotenv.config();

async function runFlowWithPrivateKey() {
  const exampleNetwork = regtest;
  const exampleBitcoinBlockchainAPI = 'https://devnet.dlc.link/electrs';
  const exampleBitcoinBlockchainFeeRecommendationAPI = 'https://devnet.dlc.link/electrs/fee-estimates';
  const exampleAttestorURLs = [
    'http://devnet.dlc.link/attestor-1',
    'http://devnet.dlc.link/attestor-2',
    'http://devnet.dlc.link/attestor-3',
  ];
  const examplePrivateKey =
    'tprv8ZgxMBicQKsPeJ7iQfVEb34R3JoSyJ1J9z6wv1yXJkd1NMTRbmQiLkcZXgqQ277LMtszhnp2L2VmmHhFzoLD12fjyXcAvfnvs6qTJMMcKFq';
  const exampleBitcoinAmount = 0.01;
  const ethereumPrivateKey = '';

  const deploymentPlansPromises = ['TokenManager', 'DLCManager', 'DLCBTC'].map((contractName) => {
    return fetchEthereumDeploymentPlan(
      contractName,
      ethereumArbitrumSepolia,
      'dev',
      'https://raw.githubusercontent.com/DLC-link/dlc-solidity'
    );
  });

  const deploymentPlans = await Promise.all(deploymentPlansPromises);

  // Setup Ethereum
  const rpcEndpoint = '';
  const readOnlyRPCEndpoint = '';

  if (!rpcEndpoint) {
    throw new Error('Ethereum RPC Endpoint not set');
  }

  if (!ethereumPrivateKey) {
    throw new Error('Ethereum Private Key not set');
  }
  const ethereumHandler = new EthereumHandler(deploymentPlans, ethereumPrivateKey, rpcEndpoint, readOnlyRPCEndpoint);

  const setupVaultTransactionReceipt = await ethereumHandler.setupVault(shiftValue(exampleBitcoinAmount));
  if (!setupVaultTransactionReceipt) {
    throw new Error('Could not setup Vault');
  }
  const vaultUUID = setupVaultTransactionReceipt.events.find((event: any) => event.event === 'SetupVault').args[0];

  console.log('vaultUUID', vaultUUID);

  // Setup DLC Handler (with Private Key)
  const dlcHandler = new PrivateKeyDLCHandler(
    examplePrivateKey,
    0,
    exampleNetwork,
    exampleBitcoinBlockchainAPI,
    exampleBitcoinBlockchainFeeRecommendationAPI
  );

  // Fetch Vault
  const vault = await ethereumHandler.getRawVault(vaultUUID);

  // Fetch Attestor Group Public Key
  const attestorGroupPublicKey = await ethereumHandler.getAttestorGroupPublicKey();

  // Create Funding Transaction
  const fundingPSBT = await dlcHandler.createFundingPSBT(vault, attestorGroupPublicKey, 2);

  // Sign Funding Transaction
  const fundingTransaction = dlcHandler.signPSBT(fundingPSBT, 'funding');

  // Create Closing Transaction
  const closingTransaction = await dlcHandler.createClosingPSBT(vault, fundingTransaction.id, 2);

  console.log('address', dlcHandler.payment?.nativeSegwitPayment.address);
  // Sign Closing Transaction
  const partiallySignedClosingTransaction = dlcHandler.signPSBT(closingTransaction, 'closing');
  const partiallySignedClosingTransactionHex = bytesToHex(partiallySignedClosingTransaction.toPSBT());

  const nativeSegwitAddress = dlcHandler.getVaultRelatedAddress('p2wpkh');

  // Send Required Information to Attestors to Create PSBT Event
  const attestorHandler = new AttestorHandler(exampleAttestorURLs, ethereumArbitrumSepolia);

  await attestorHandler.createPSBTEvent(
    vaultUUID,
    fundingTransaction.hex,
    partiallySignedClosingTransactionHex,
    nativeSegwitAddress
  );

  // Broadcast Funding Transaction
  const fundingTransactionID = await broadcastTransaction(fundingTransaction.hex, exampleBitcoinBlockchainAPI);

  console.log('Funding Transaction ID:', fundingTransactionID);
  console.log('Success');
}

// async function runFlowWithLedger() {
//   const exampleNetwork = testnet;
//   const exampleAttestorURLs = [
//     'https://testnet.dlc.link/attestor-1',
//     'https://testnet.dlc.link/attestor-2',
//     'https://testnet.dlc.link/attestor-3',
//   ];
//   const exampleBitcoinAmount = 0.01;

//   // Setup Ethereum
//   const { ethereumContracts, ethereumNetworkName } = await setupEthereum();
//   const { protocolContract } = ethereumContracts;

//   // Setup Vault
//   const setupVaultTransactionReceipt: any = await setupVault(
//     protocolContract,
//     ethereumNetworkName,
//     exampleBitcoinAmount
//   );
//   if (!setupVaultTransactionReceipt) {
//     throw new Error('Could not setup Vault');
//   }
//   const vaultUUID = setupVaultTransactionReceipt.events.find((event: any) => event.event === 'SetupVault').args[0];
//   // const vaultUUID = '0x1e0bf7ac4dc3886bcdb1d4bd1813a0b0d923f83d61ad1776e45677cec83e4a65';

//   const ledgerApp = await getLedgerApp(LEDGER_APPS_MAP.BITCOIN_TESTNET);

//   if (!ledgerApp) {
//     throw new Error('Could not get Ledger App');
//   }

//   const masterFingerprint = await ledgerApp.getMasterFingerprint();

//   // Setup DLC Handler (with Private Key)
//   const dlcHandler = new LedgerDLCHandler(ledgerApp, masterFingerprint, 1, testnet);

//   // Fetch Vault
//   const vault = await getRawVault(protocolContract, vaultUUID);

//   // Fetch Attestor Group Public Key
//   const attestorGroupPublicKey = await getAttestorGroupPublicKey(ethereumArbitrumSepolia);

//   await dlcHandler.createPayment(vaultUUID, attestorGroupPublicKey);

//   // Create Funding Transaction
//   const fundingPSBT = await dlcHandler.createFundingPSBT(vault, 2);

//   // Sign Funding Transaction
//   const fundingTransaction = await dlcHandler.signPSBT(fundingPSBT, 'funding');

//   // Create Closing Transaction
//   const closingTransaction = await dlcHandler.createClosingPSBT(vault, fundingTransaction.id, 2);

//   // Sign Closing Transaction
//   const partiallySignedClosingTransaction = await dlcHandler.signPSBT(closingTransaction, 'closing');
//   const partiallySignedClosingTransactionHex = bytesToHex(partiallySignedClosingTransaction.toPSBT());

//   const nativeSegwitAddress = dlcHandler.getVaultRelatedAddress('p2wpkh');

//   // Send Required Information to Attestors to Create PSBT Event
//   await createPSBTEvent(
//     exampleAttestorURLs,
//     vaultUUID,
//     fundingTransaction.hex,
//     partiallySignedClosingTransactionHex,
//     nativeSegwitAddress
//   );

//   // Broadcast Funding Transaction
//   const fundingTransactionID = await broadcastTransaction(fundingTransaction.hex, 'https://mempool.space/testnet/api');

//   console.log('Funding Transaction ID:', fundingTransactionID);
//   console.log('Success');
// }

async function example() {
  try {
    await runFlowWithPrivateKey();
    // await runFlowWithLedger();
  } catch (error) {
    throw new Error(`Error: ${error}`);
  }
}

example();
