import { bytesToHex } from '@noble/hashes/utils';
import { regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import { Event } from 'ethers';

import { AttestorHandler } from './attestor-handlers/attestor-handler.js';
import { ethereumArbitrumSepolia } from './constants/ethereum-constants.js';
import {
  EXAMPLE_BITCOIN_AMOUNT,
  EXAMPLE_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API,
  EXAMPLE_BITCOIN_EXTENDED_PRIVATE_KEY,
  EXAMPLE_BITCOIN_WALLET_ACCOUNT_INDEX,
  EXAMPLE_ETHEREUM_ATTESTOR_CHAIN_ID,
  EXAMPLE_ETHEREUM_DEVNET_GITHUB_DEPLOYMENT_PLAN_BRANCH,
  EXAMPLE_ETHEREUM_GITHUB_DEPLOYMENT_PLAN_ROOT_URL,
  EXAMPLE_ETHEREUM_NODE_API,
  EXAMPLE_ETHEREUM_PRIVATE_KEY,
  EXAMPLE_ETHEREUM_READ_ONLY_NODE_API,
  EXAMPLE_ETHEREUM_TESTNET_GITHUB_DEPLOYMENT_PLAN_BRANCH,
  EXAMPLE_REGTEST_ATTESTOR_APIS,
  EXAMPLE_REGTEST_BITCOIN_BLOCKCHAIN_API,
  EXAMPLE_TESTNET_ATTESTOR_APIS,
  EXAMPLE_TESTNET_ATTESTOR_GROUP_PUBLIC_KEY_V1,
  EXAMPLE_TESTNET_BITCOIN_BLOCKCHAIN_API,
} from './constants/example-constants.js';
import { LEDGER_APPS_MAP } from './constants/ledger-constants.js';
import { LedgerDLCHandler } from './dlc-handlers/ledger-dlc-handler.js';
import { PrivateKeyDLCHandler } from './dlc-handlers/private-key-dlc-handler.js';
import { broadcastTransaction } from './functions/bitcoin/bitcoin-request-functions.js';
import {
  fetchEthereumDeploymentPlan,
  fetchEthereumDeploymentPlansByNetwork,
} from './functions/ethereum/ethereum-functions.js';
import { getLedgerApp } from './functions/hardware-wallet/ledger-functions.js';
import { EthereumHandler } from './network-handlers/ethereum-handler.js';
import { ReadOnlyEthereumHandler } from './network-handlers/read-only-ethereum-handler.js';
import { ProofOfReserveHandler } from './proof-of-reserve-handlers/proof-of-reserve-handler.js';
import { shiftValue } from './utilities/index.js';

async function runFlowWithPrivateKey() {
  // Fetch Ethereum Contract Deployment Plans
  const deploymentPlans = await Promise.all(
    ['TokenManager', 'DLCManager', 'DLCBTC'].map(contractName => {
      return fetchEthereumDeploymentPlan(
        contractName,
        ethereumArbitrumSepolia,
        EXAMPLE_ETHEREUM_DEVNET_GITHUB_DEPLOYMENT_PLAN_BRANCH,
        EXAMPLE_ETHEREUM_GITHUB_DEPLOYMENT_PLAN_ROOT_URL
      );
    })
  );

  // Setup Ethereum Handler (with Private Key)
  const ethereumHandler = new EthereumHandler(
    deploymentPlans,
    EXAMPLE_ETHEREUM_PRIVATE_KEY,
    EXAMPLE_ETHEREUM_NODE_API,
    EXAMPLE_ETHEREUM_READ_ONLY_NODE_API
  );

  // Setup Vault
  const setupVaultTransactionReceipt = await ethereumHandler.setupVault(
    shiftValue(EXAMPLE_BITCOIN_AMOUNT)
  );

  if (!setupVaultTransactionReceipt) {
    throw new Error('Could not setup Vault');
  }

  const vaultUUID = setupVaultTransactionReceipt.events.find(
    (event: Event) => event.event === 'SetupVault'
  ).args[0];

  // Setup DLC Handler (with Private Key)
  const dlcHandler = new PrivateKeyDLCHandler(
    EXAMPLE_BITCOIN_EXTENDED_PRIVATE_KEY,
    EXAMPLE_BITCOIN_WALLET_ACCOUNT_INDEX,
    regtest,
    EXAMPLE_REGTEST_BITCOIN_BLOCKCHAIN_API,
    EXAMPLE_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API
  );

  // Fetch Created Vault
  const vault = await ethereumHandler.getRawVault(vaultUUID);

  // Fetch Attestor Group Public Key from the Smart Contract
  const attestorGroupPublicKey = await ethereumHandler.getAttestorGroupPublicKey();

  // Create Funding Transaction
  const fundingPSBT = await dlcHandler.createFundingPSBT(vault, attestorGroupPublicKey, 2);

  // Sign Funding Transaction
  const fundingTransaction = dlcHandler.signPSBT(fundingPSBT, 'funding');

  // Create Closing Transaction
  const closingTransaction = await dlcHandler.createClosingPSBT(vault, fundingTransaction.id, 2);

  // Sign Closing Transaction
  const partiallySignedClosingTransaction = dlcHandler.signPSBT(closingTransaction, 'closing');
  const partiallySignedClosingTransactionHex = bytesToHex(
    partiallySignedClosingTransaction.toPSBT()
  );

  // Get Native Segwit Address used for the Vault
  const nativeSegwitAddress = dlcHandler.getVaultRelatedAddress('p2wpkh');

  // Setup Attestor Handler
  const attestorHandler = new AttestorHandler(
    EXAMPLE_REGTEST_ATTESTOR_APIS,
    EXAMPLE_ETHEREUM_ATTESTOR_CHAIN_ID
  );

  // Send Required Information to Attestors to Create PSBT Event
  await attestorHandler.createPSBTEvent(
    vaultUUID,
    fundingTransaction.hex,
    partiallySignedClosingTransactionHex,
    nativeSegwitAddress
  );

  // Broadcast Funding Transaction
  await broadcastTransaction(fundingTransaction.hex, EXAMPLE_REGTEST_BITCOIN_BLOCKCHAIN_API);
}

async function runFlowWithLedger() {
  // Fetch Ethereum Contract Deployment Plans
  const deploymentPlans = await Promise.all(
    ['TokenManager', 'DLCManager', 'DLCBTC'].map(contractName => {
      return fetchEthereumDeploymentPlan(
        contractName,
        ethereumArbitrumSepolia,
        EXAMPLE_ETHEREUM_TESTNET_GITHUB_DEPLOYMENT_PLAN_BRANCH,
        EXAMPLE_ETHEREUM_GITHUB_DEPLOYMENT_PLAN_ROOT_URL
      );
    })
  );

  // Setup Ethereum Handler (with Private Key)
  const ethereumHandler = new EthereumHandler(
    deploymentPlans,
    EXAMPLE_ETHEREUM_PRIVATE_KEY,
    EXAMPLE_ETHEREUM_NODE_API,
    EXAMPLE_ETHEREUM_READ_ONLY_NODE_API
  );

  // Setup Vault
  const setupVaultTransactionReceipt = await ethereumHandler.setupVault(
    shiftValue(EXAMPLE_BITCOIN_AMOUNT)
  );

  if (!setupVaultTransactionReceipt) {
    throw new Error('Could not setup Vault');
  }

  const vaultUUID = setupVaultTransactionReceipt.events.find(
    (event: any) => event.event === 'SetupVault'
  ).args[0];

  const ledgerApp = await getLedgerApp(LEDGER_APPS_MAP.BITCOIN_TESTNET);

  if (!ledgerApp) {
    throw new Error('Could not get Ledger App');
  }

  const masterFingerprint = await ledgerApp.getMasterFingerprint();

  // Setup DLC Handler (with Private Key)
  const dlcHandler = new LedgerDLCHandler(ledgerApp, masterFingerprint, 1, testnet);

  // Fetch Created Vault
  const vault = await ethereumHandler.getRawVault(vaultUUID);

  // Fetch Attestor Group Public Key from the Smart Contract
  const attestorGroupPublicKey = await ethereumHandler.getAttestorGroupPublicKey();

  // Create Funding Transaction
  const fundingPSBT = await dlcHandler.createFundingPSBT(vault, attestorGroupPublicKey, 2);

  // Sign Funding Transaction
  const fundingTransaction = await dlcHandler.signPSBT(fundingPSBT, 'funding');

  // Create Closing Transaction
  const closingTransaction = await dlcHandler.createClosingPSBT(vault, fundingTransaction.id, 2);

  // Sign Closing Transaction
  const partiallySignedClosingTransaction = await dlcHandler.signPSBT(
    closingTransaction,
    'closing'
  );
  const partiallySignedClosingTransactionHex = bytesToHex(
    partiallySignedClosingTransaction.toPSBT()
  );

  // Get Native Segwit Address used for the Vault
  const nativeSegwitAddress = dlcHandler.getVaultRelatedAddress('p2wpkh');

  // Setup Attestor Handler
  const attestorHandler = new AttestorHandler(
    EXAMPLE_TESTNET_ATTESTOR_APIS,
    EXAMPLE_ETHEREUM_ATTESTOR_CHAIN_ID
  );

  // Send Required Information to Attestors to Create PSBT Event
  await attestorHandler.createPSBTEvent(
    vaultUUID,
    fundingTransaction.hex,
    partiallySignedClosingTransactionHex,
    nativeSegwitAddress
  );

  // Broadcast Funding Transaction
  await broadcastTransaction(fundingTransaction.hex, EXAMPLE_TESTNET_BITCOIN_BLOCKCHAIN_API);
}

async function runProofOfReserveCalculation() {
  // Fetch Ethereum Contract Deployment Plans
  const deploymentPlans = await fetchEthereumDeploymentPlansByNetwork('arbitrum-sepolia-testnet');

  // Setup Read-Only Ethereum Handler
  const ethereumHandler = new ReadOnlyEthereumHandler(deploymentPlans, EXAMPLE_ETHEREUM_NODE_API);

  // Fetch Attestor Group Public Key from the Smart Contract
  const attestorGroupPublicKey = await ethereumHandler.getAttestorGroupPublicKey();

  // Fetch All Funded Vaults from the Ethereum Smart Contract
  const fundedVaults = await ethereumHandler.getContractFundedVaults();

  // Setup Proof of Reserve Handler
  const proofOfReserveHandler = new ProofOfReserveHandler(
    EXAMPLE_TESTNET_BITCOIN_BLOCKCHAIN_API,
    testnet,
    EXAMPLE_TESTNET_ATTESTOR_GROUP_PUBLIC_KEY_V1,
    attestorGroupPublicKey
  );

  // Calculate Proof of Reserve in Sats
  const proofOfReserveInSats = await proofOfReserveHandler.calculateProofOfReserve(fundedVaults);
  console.log(`Proof of Reserve in Sats: ${proofOfReserveInSats}`);
}

async function example() {
  try {
    await runFlowWithPrivateKey();
    await runFlowWithLedger();
    await runProofOfReserveCalculation();
  } catch (error) {
    throw new Error(`Error: ${error}`);
  }
}

example();
