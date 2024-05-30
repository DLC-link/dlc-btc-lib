import { EthereumNetwork, EthereumNetworkID } from '@models/ethereum-models.js';

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

export const supportedEthereumNetworks: EthereumNetwork[] = [
  ethereumArbitrumSepolia,
  ethereumArbitrum,
];

export const hexChainIDs: { [key in EthereumNetworkID]: string } = {
  [EthereumNetworkID.ArbitrumSepolia]: '0x66eee',
  [EthereumNetworkID.Arbitrum]: '0xa4b1',
};

export const addNetworkParams = {
  [EthereumNetworkID.ArbitrumSepolia]: [
    {
      chainId: '0x66eee',
      rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc', 'https://arb-sepolia.infura.io/v3/'],
      chainName: 'Arbitrum Sepolia Testnet',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      },
      blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
    },
  ],
  [EthereumNetworkID.Arbitrum]: [
    {
      chainId: '42161',
      rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-mainnet.infura.io'],
      chainName: 'Arbitrum One',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      },
      blockExplorerUrls: ['https://arbiscan.io/'],
    },
  ],
};
