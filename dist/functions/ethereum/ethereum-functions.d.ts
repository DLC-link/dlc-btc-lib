import { Contract, Wallet, providers } from 'ethers';
import { DLCEthereumContracts, EthereumDeploymentPlan, EthereumNetwork, RawVault, SupportedNetwork } from '../../models/ethereum-models.js';
export declare function fetchEthereumDeploymentPlan(contractName: string, ethereumNetwork: EthereumNetwork, deploymentBranch: string, deploymentPlanRootURL: string): Promise<EthereumDeploymentPlan>;
export declare function fetchEthereumDeploymentPlansByNetwork(network: SupportedNetwork): Promise<EthereumDeploymentPlan[]>;
export declare function getProvider(rpcEndpoint: string): providers.JsonRpcProvider | providers.WebSocketProvider;
export declare function getEthereumontract(ethereumDeploymentPlans: EthereumDeploymentPlan[], contractName: string, signerOrProvider: Wallet | providers.JsonRpcSigner | providers.JsonRpcProvider): Contract;
export declare function getEthereumContracts(ethereumDeploymentPlans: EthereumDeploymentPlan[], signer: Wallet | providers.JsonRpcSigner): DLCEthereumContracts;
export declare function getReadOnlyEthereumContracts(ethereumDeploymentPlans: EthereumDeploymentPlan[], readOnlyProvider: providers.JsonRpcProvider): {
    protocolContract: Contract;
    dlcManagerContract: Contract;
    dlcBTCContract: Contract;
};
export declare function getLockedBTCBalance(userVaults: RawVault[]): Promise<number>;
