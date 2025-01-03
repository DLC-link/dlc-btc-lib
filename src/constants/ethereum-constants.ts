import {
  DLCEthereumContractName,
  EthereumNetwork,
  EthereumNetworkID,
} from '../models/ethereum-models.js';

export const ethereumMainnet: EthereumNetwork = {
  name: 'Mainnet',
  displayName: 'Mainnet',
  id: EthereumNetworkID.Mainnet,
  defaultNodeURL: 'https://cloudflare-eth.com',
};

export const ethereumSepolia: EthereumNetwork = {
  name: 'Sepolia',
  displayName: 'Sepolia',
  id: EthereumNetworkID.Sepolia,
  defaultNodeURL: 'https://rpc.sepolia.org',
};

export const ethereumBase: EthereumNetwork = {
  name: 'Base',
  displayName: 'Base',
  id: EthereumNetworkID.Base,
  defaultNodeURL: 'https://mainnet.base.org',
};

export const ethereumBaseSepolia: EthereumNetwork = {
  name: 'BaseSepolia',
  displayName: 'Base Sepolia',
  id: EthereumNetworkID.BaseSepolia,
  defaultNodeURL: 'https://sepolia.base.org',
};

export const ethereumArbitrumSepolia: EthereumNetwork = {
  name: 'ArbSepolia',
  displayName: 'Arbitrum Sepolia',
  id: EthereumNetworkID.ArbitrumSepolia,
  defaultNodeURL: 'https://sepolia-rollup.arbitrum.io/rpc',
};

export const ethereumArbitrum: EthereumNetwork = {
  name: 'Arbitrum',
  displayName: 'Arbitrum',
  id: EthereumNetworkID.Arbitrum,
  defaultNodeURL: 'https://arb1.arbitrum.io/rpc',
};

const ethereumHardhat: EthereumNetwork = {
  name: 'Hardhat',
  displayName: 'Hardhat',
  id: EthereumNetworkID.Hardhat,
  defaultNodeURL: 'http://localhost:8545',
};

const ethereumAvalanche: EthereumNetwork = {
  name: 'Avax',
  displayName: 'Avalanche',
  id: EthereumNetworkID.Avalanche,
  defaultNodeURL: 'https://api.avax.network/ext/bc/C/rpc',
};

const ethereumBSC: EthereumNetwork = {
  name: 'BSC',
  displayName: 'Binace Smart Chain',
  id: EthereumNetworkID.BSC,
  defaultNodeURL: 'https://rpc.ankr.com/bsc',
};

export const supportedEthereumNetworks: EthereumNetwork[] = [
  ethereumArbitrumSepolia,
  ethereumArbitrum,
  ethereumMainnet,
  ethereumSepolia,
  ethereumBase,
  ethereumBaseSepolia,
  ethereumAvalanche,
  ethereumBSC,
  ethereumHardhat,
];

export const GITHUB_SOLIDITY_URL = 'https://raw.githubusercontent.com/DLC-link/dlc-solidity';

export const dlcContractNames: DLCEthereumContractName[] = ['DLCManager', 'DLCBTC'];
