import { getProvider, getReadOnlyEthereumContracts, } from '../functions/ethereum/ethereum-functions.js';
import { EthereumError } from '../models/errors.js';
import { VaultState, } from '../models/ethereum-models.js';
export class ReadOnlyEthereumHandler {
    ethereumContracts;
    constructor(ethereumDeploymentPlans, rpcEndpoint) {
        this.ethereumContracts = getReadOnlyEthereumContracts(ethereumDeploymentPlans, getProvider(rpcEndpoint));
    }
    getContracts() {
        return this.ethereumContracts;
    }
    async getRawVault(vaultUUID) {
        const vault = await this.ethereumContracts.dlcManagerContract.getVault(vaultUUID);
        if (!vault)
            throw new Error('Vault not found');
        return vault;
    }
    async getAttestorGroupPublicKey() {
        try {
            const attestorGroupPubKey = await this.ethereumContracts.dlcManagerContract.attestorGroupPubKey();
            if (!attestorGroupPubKey)
                throw new Error('Could not get Attestor Group Public Key');
            return attestorGroupPubKey;
        }
        catch (error) {
            throw new EthereumError(`Could not fetch Attestor Public Key: ${error}`);
        }
    }
    async getContractTransferEvents(contractName) {
        try {
            switch (contractName) {
                case 'DLCBTC':
                    return await this.ethereumContracts.dlcBTCContract.queryFilter(this.ethereumContracts.dlcBTCContract.filters.Transfer());
                case 'DLCManager':
                    return await this.ethereumContracts.dlcManagerContract.queryFilter(this.ethereumContracts.dlcManagerContract.filters.Transfer());
                default:
                    throw new Error('Invalid Contract Name');
            }
        }
        catch (error) {
            throw new EthereumError(`Could not fetch Transfer Events: ${error}`);
        }
    }
    async getContractTotalSupply() {
        try {
            const totalSupply = await this.ethereumContracts.dlcBTCContract.totalSupply();
            return totalSupply.toNumber();
        }
        catch (error) {
            throw new EthereumError(`Could not fetch Total Supply: ${error}`);
        }
    }
    async getContractFundedVaults(amount = 50) {
        try {
            let totalFetched = 0;
            const fundedVaults = [];
            let shouldContinue = true;
            while (shouldContinue) {
                const fetchedVaults = await this.ethereumContracts.dlcManagerContract.getAllDLCs(totalFetched, totalFetched + amount);
                const filteredVaults = fetchedVaults.filter(vault => vault.status === VaultState.FUNDED);
                fundedVaults.push(...filteredVaults);
                totalFetched += amount;
                shouldContinue = fetchedVaults.length === amount;
            }
            return fundedVaults;
        }
        catch (error) {
            throw new EthereumError(`Could not fetch Funded Vaults: ${error instanceof Error ? error.message : error}`);
        }
    }
}
