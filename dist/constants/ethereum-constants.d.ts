import { DLCEthereumContractName, EthereumNetwork, EthereumNetworkID } from '../models/ethereum-models.js';
export declare const ethereumArbitrumSepolia: EthereumNetwork;
export declare const ethereumArbitrum: EthereumNetwork;
export declare const supportedEthereumNetworks: EthereumNetwork[];
export declare const hexChainIDs: {
    [key in EthereumNetworkID]: string;
};
export declare const addNetworkParams: {
    "421614": {
        chainId: string;
        rpcUrls: string[];
        chainName: string;
        nativeCurrency: {
            name: string;
            symbol: string;
            decimals: number;
        };
        blockExplorerUrls: string[];
    }[];
    "42161": {
        chainId: string;
        rpcUrls: string[];
        chainName: string;
        nativeCurrency: {
            name: string;
            symbol: string;
            decimals: number;
        };
        blockExplorerUrls: string[];
    }[];
};
export declare const GITHUB_SOLIDITY_URL = "https://raw.githubusercontent.com/DLC-link/dlc-solidity";
export declare const dlcContractNames: DLCEthereumContractName[];
