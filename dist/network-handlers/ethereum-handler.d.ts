import { Event, providers } from 'ethers';
import { DLCEthereumContractName, DLCEthereumContracts, EthereumDeploymentPlan, RawVault } from '../models/ethereum-models.js';
export declare class EthereumHandler {
    private ethereumContracts;
    private constructor();
    static fromPrivateKey(ethereumDeploymentPlans: EthereumDeploymentPlan[], ethereumPrivateKey: string, rpcEndpoint: string): EthereumHandler;
    static fromSigner(ethereumDeploymentPlans: EthereumDeploymentPlan[], signer: providers.JsonRpcSigner): EthereumHandler;
    getContracts(): DLCEthereumContracts;
    getAllVaults(): Promise<RawVault[]>;
    getRawVault(vaultUUID: string): Promise<RawVault>;
    setupVault(): Promise<any | undefined>;
    withdraw(vaultUUID: string, amount: bigint): Promise<any>;
    closeVault(vaultUUID: string): Promise<any>;
    getDLCBTCBalance(): Promise<number | undefined>;
    getAttestorGroupPublicKey(): Promise<string>;
    getContractTransferEvents(contractName: DLCEthereumContractName): Promise<Event[]>;
    getContractTotalSupply(): Promise<number>;
    getContractFundedVaults(amount?: number): Promise<RawVault[]>;
}
