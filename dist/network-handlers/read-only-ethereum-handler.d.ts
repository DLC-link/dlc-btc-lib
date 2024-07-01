import { Event } from 'ethers';
import { DLCEthereumContractName, DLCEthereumContracts, EthereumDeploymentPlan, RawVault } from '../models/ethereum-models.js';
export declare class ReadOnlyEthereumHandler {
    private ethereumContracts;
    constructor(ethereumDeploymentPlans: EthereumDeploymentPlan[], rpcEndpoint: string);
    getContracts(): DLCEthereumContracts;
    getRawVault(vaultUUID: string): Promise<RawVault>;
    getAttestorGroupPublicKey(): Promise<string>;
    getContractTransferEvents(contractName: DLCEthereumContractName): Promise<Event[]>;
    getContractTotalSupply(): Promise<number>;
    getContractFundedVaults(amount?: number): Promise<RawVault[]>;
}
