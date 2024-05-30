import { regtest } from 'bitcoinjs-lib/src/networks.js';

// Bitcoin
export const EXAMPLE_BITCOIN_NETWORK = regtest;
export const EXAMPLE_BITCOIN_EXTENDED_PRIVATE_KEY = '';
export const EXAMPLE_BITCOIN_WALLET_ACCOUNT_INDEX = 0;
export const EXAMPLE_REGTEST_BITCOIN_BLOCKCHAIN_API = 'https://devnet.dlc.link/electrs';
export const EXAMPLE_TESTNET_BITCOIN_BLOCKCHAIN_API = 'https://testnet.dlc.link/electrs';
export const EXAMPLE_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API =
  'https://devnet.dlc.link/electrs/fee-estimates';
export const EXAMPLE_BITCOIN_AMOUNT = 0.01;

// Ethereum
export const EXAMPLE_ETHEREUM_PRIVATE_KEY = '';
export const EXAMPLE_ETHEREUM_NODE_API = 'https://sepolia-rollup.arbitrum.io/rpc';
export const EXAMPLE_ETHEREUM_READ_ONLY_NODE_API = 'https://sepolia-rollup.arbitrum.io/rpc';
export const EXAMPLE_ETHEREUM_GITHUB_DEPLOYMENT_PLAN_ROOT_URL =
  'https://raw.githubusercontent.com/DLC-link/dlc-solidity';
export const EXAMPLE_ETHEREUM_DEVNET_GITHUB_DEPLOYMENT_PLAN_BRANCH = 'dev';
export const EXAMPLE_ETHEREUM_TESTNET_GITHUB_DEPLOYMENT_PLAN_BRANCH = 'testnet-rolling';
export const EXAMPLE_ETHEREUM_ATTESTOR_CHAIN_ID = 'evm-arbsepolia';

// Attestor
export const EXAMPLE_REGTEST_ATTESTOR_APIS = [
  'https://devnet.dlc.link/attestor-1',
  'https://devnet.dlc.link/attestor-2',
  'https://devnet.dlc.link/attestor-3',
];

export const EXAMPLE_TESTNET_ATTESTOR_APIS = [
  'https://testnet.dlc.link/attestor-1',
  'https://testnet.dlc.link/attestor-2',
  'https://testnet.dlc.link/attestor-3',
];

export const EXAMPLE_TESTNET_ATTESTOR_GROUP_PUBLIC_KEY_V1 =
  '0c0bf55fa1ab72462467b973b13e556b07d2fdd8d7a30cdfc10f337e23c7ac00';
