export const TEST_REGTEST_BITCOIN_BLOCKCHAIN_API = 'https://devnet.dlc.link/electrs';
export const TEST_TESTNET_BITCOIN_BLOCKCHAIN_API = 'https://testnet.dlc.link/electrs';
export const TEST_MAINNET_BITCOIN_BLOCKCHAIN_API = 'https://mainnet.dlc.link/electrs';

export const TEST_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API =
  'https://devnet.dlc.link/electrs/fee-estimates';

export const TEST_REGTEST_ATTESTOR_APIS = [
  'https://devnet.dlc.link/attestor-1',
  'https://devnet.dlc.link/attestor-2',
  'https://devnet.dlc.link/attestor-3',
];

export const TEST_ETHEREUM_NODE_API = 'https://sepolia-rollup.arbitrum.io/rpc';
export const TEST_ETHEREUM_READ_ONLY_NODE_API = 'https://sepolia-rollup.arbitrum.io/rpc';

export const TEST_ETHEREUM_GITHUB_DEPLOYMENT_PLAN_ROOT_URL =
  'https://raw.githubusercontent.com/DLC-link/dlc-solidity';

export const TEST_TESTNET_BITCOINCORE_RPC_USERNAME = 'testnet';
export const TEST_TESTNET_BITCOINCORE_RPC_PASSWORD = 'testnet';
export const TEST_TESTNET_BITCOINCORE_RPC_URL = '${TEST_TESTNET_BITCOIN_BLOCKCHAIN_API}';
export const TEST_TESTNET_BITCOINCORE_RPC_PORT = 18332;

export const TEST_REGTEST_BITCOINCORE_RPC_USERNAME = 'regtest';
export const TEST_REGTEST_BITCOINCORE_RPC_PASSWORD = 'regtest';
export const TEST_REGTEST_BITCOINCORE_RPC_URL = '${TEST_REGTEST_BITCOIN_BLOCKCHAIN_API}';
export const TEST_REGTEST_BITCOINCORE_RPC_PORT = 18443;
