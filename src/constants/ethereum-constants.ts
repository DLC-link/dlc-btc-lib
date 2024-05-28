/** @format */

export interface EthereumNetwork {
  id: EthereumNetworkID;
  name: string;
  displayName: string;
  defaultNodeURL: string;
}

export enum EthereumNetworkID {
  ArbSepolia = '421614',
  Arbitrum = '42161',
}

export const ethereumArbitrumSepolia: EthereumNetwork = {
  name: 'ArbSepolia',
  displayName: 'Arbitrum Sepolia',
  id: EthereumNetworkID.ArbSepolia,
  defaultNodeURL: 'https://sepolia-rollup.arbitrum.io/rpc',
};

export const ethereumArbitrum: EthereumNetwork = {
  name: 'Arbitrum',
  displayName: 'Arbitrum',
  id: EthereumNetworkID.Arbitrum,
  defaultNodeURL: 'https://arb1.arbitrum.io/rpc',
};

export const ethereumNetworks: EthereumNetwork[] = [ethereumArbitrumSepolia, ethereumArbitrum];

export const hexChainIDs: { [key in EthereumNetworkID]: string } = {
  [EthereumNetworkID.ArbSepolia]: '0x66eee',
  [EthereumNetworkID.Arbitrum]: '0xa4b1',
};
