/** @format */

import dotenv from 'dotenv';
import { getAttestorGroupPublicKey, getRawVault, setupEthereum, setupVault } from './ethereum-functions.js';
import { bytesToHex } from '@noble/hashes/utils';
import { createPSBTEvent } from './attestor-functions.js';
import { broadcastTransaction } from './bitcoin-functions.js';
import { ethereumArbitrumSepolia } from './ethereum-network.js';
import { PrivateKeyDLCHandler } from './handle-functions.js';

dotenv.config();

async function runFlowWithPrivateKey() {
  const exampleNetwork = 'Regtest';
  const exampleBitcoinBlockchainAPI = 'https://devnet.dlc.link/electrs';
  const exampleBitcoinBlockchainFeeRecommendationAPI = 'https://devnet.dlc.link/electrs/fee-estimates';
  const exampleAttestorURLs = [
    'http://devnet.dlc.link/attestor-1',
    'http://devnet.dlc.link/attestor-2',
    'http://devnet.dlc.link/attestor-3',
  ];
  const examplePrivateKey =
    'tprv8ZgxMBicQKsPeG5nzxJedpsrQgY4prd9pvjwXDZVN2nY8u8Ef6XJmL8LDZXc6y5MMDyEQgw8uond2YmSjF43FXPxiKKY6gdgN7Cxi1Fs3iR';
  const exampleBitcoinAmount = 0.01;

  // Setup Ethereum
  const { ethereumContracts, ethereumNetworkName } = await setupEthereum();
  const { protocolContract } = ethereumContracts;

  // Setup Vault
  const setupVaultTransactionReceipt: any = await setupVault(
    protocolContract,
    ethereumNetworkName,
    exampleBitcoinAmount
  );
  if (!setupVaultTransactionReceipt) {
    throw new Error('Could not setup Vault');
  }
  const vaultUUID = setupVaultTransactionReceipt.events.find((event: any) => event.event === 'SetupVault').args[0];

  // Setup DLC Handler (with Private Key)
  const dlcHandler = new PrivateKeyDLCHandler(
    examplePrivateKey,
    exampleNetwork,
    exampleBitcoinBlockchainAPI,
    exampleBitcoinBlockchainFeeRecommendationAPI
  );

  // Fetch Vault
  const vault = await getRawVault(protocolContract, vaultUUID);

  // Fetch Attestor Group Public Key
  const attestorGroupPublicKey = await getAttestorGroupPublicKey(ethereumArbitrumSepolia);

  // Setup Payment and Key Pair Information
  const { nativeSegwitPayment, nativeSegwitDerivedKeyPair, taprootMultisigPayment, taprootDerivedKeyPair } =
    dlcHandler.handlePayment(vault.uuid, 0, attestorGroupPublicKey);

  // Create Funding Transaction
  const fundingPSBT = await dlcHandler.createFundingPSBT(vault, nativeSegwitPayment, taprootMultisigPayment, 2n);

  if (!nativeSegwitDerivedKeyPair.privateKey) {
    throw new Error('Could not get Private Key from Native Segwit Derived Key Pair');
  }

  // Sign Funding Transaction
  const fundingTransaction = dlcHandler.signPSBT(fundingPSBT, nativeSegwitDerivedKeyPair.privateKey, true);

  // Create Closing Transaction
  const closingTransaction = await dlcHandler.createClosingPSBT(
    vault,
    nativeSegwitPayment,
    taprootMultisigPayment,
    fundingTransaction.id,
    2n
  );

  if (!taprootDerivedKeyPair.privateKey) {
    throw new Error('Could not get Private Key from Taproot Derived Key Pair');
  }

  // Sign Closing Transaction
  const partiallySignedClosingTransaction = dlcHandler.signPSBT(closingTransaction, taprootDerivedKeyPair.privateKey);
  const partiallySignedClosingTransactionHex = bytesToHex(partiallySignedClosingTransaction.toPSBT());

  // Send Required Information to Attestors to Create PSBT Event
  await createPSBTEvent(
    exampleAttestorURLs,
    vaultUUID,
    fundingTransaction.hex,
    partiallySignedClosingTransactionHex,
    nativeSegwitPayment.address!
  );

  // Broadcast Funding Transaction
  const fundingTransactionID = await broadcastTransaction(fundingTransaction.hex, exampleBitcoinBlockchainAPI);

  console.log('Funding Transaction ID:', fundingTransactionID);
  console.log('Success');
}

async function example() {
  try {
    await runFlowWithPrivateKey();
  } catch (error) {
    throw new Error(`Error: ${error}`);
  }
}

example();
