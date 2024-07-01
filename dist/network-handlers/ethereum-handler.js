import { Wallet } from 'ethers';
import { getEthereumContracts, getProvider } from '../functions/ethereum/ethereum-functions.js';
import { EthereumError } from '../models/errors.js';
import { VaultState, } from '../models/ethereum-models.js';
export class EthereumHandler {
    ethereumContracts;
    constructor(ethereumContracts) {
        this.ethereumContracts = ethereumContracts;
    }
    static fromPrivateKey(ethereumDeploymentPlans, ethereumPrivateKey, rpcEndpoint) {
        const provider = getProvider(rpcEndpoint);
        const signer = new Wallet(ethereumPrivateKey, provider);
        const ethereumContracts = getEthereumContracts(ethereumDeploymentPlans, signer);
        return new EthereumHandler(ethereumContracts);
    }
    static fromSigner(ethereumDeploymentPlans, signer) {
        const ethereumContracts = getEthereumContracts(ethereumDeploymentPlans, signer);
        return new EthereumHandler(ethereumContracts);
    }
    getContracts() {
        return this.ethereumContracts;
    }
    async getAllVaults() {
        try {
            const userAddress = await this.ethereumContracts.dlcManagerContract.signer.getAddress();
            return await this.ethereumContracts.dlcManagerContract.getAllVaultsForAddress(userAddress);
        }
        catch (error) {
            throw new EthereumError(`Could not fetch Vaults: ${error}`);
        }
    }
    async getRawVault(vaultUUID) {
        const vault = await this.ethereumContracts.dlcManagerContract.getVault(vaultUUID);
        if (!vault)
            throw new Error('Vault not found');
        return vault;
    }
    async setupVault() {
        try {
            await this.ethereumContracts.dlcManagerContract.callStatic.setupVault();
            const transaction = await this.ethereumContracts.dlcManagerContract.setupVault();
            return await transaction.wait();
        }
        catch (error) {
            throw new EthereumError(`Could not setup Vault: ${error}`);
        }
    }
    async withdraw(vaultUUID, amount) {
        try {
            await this.ethereumContracts.dlcManagerContract.callStatic.withdraw(vaultUUID, amount);
            const transaction = await this.ethereumContracts.dlcManagerContract.withdraw(vaultUUID, amount);
            return await transaction.wait();
        }
        catch (error) {
            throw new EthereumError(`Unable to perform withdraw: ${error}`);
        }
    }
    async closeVault(vaultUUID) {
        try {
            await this.ethereumContracts.dlcManagerContract.callStatic.closeVault(vaultUUID);
            const transaction = await this.ethereumContracts.dlcManagerContract.closeVault(vaultUUID);
            return await transaction.wait();
        }
        catch (error) {
            throw new EthereumError(`Could not close Vault: ${error}`);
        }
    }
    async getDLCBTCBalance() {
        try {
            const userAddress = await this.ethereumContracts.dlcManagerContract.signer.getAddress();
            const balance = await this.ethereumContracts.dlcBTCContract.balanceOf(userAddress);
            return balance.toNumber();
        }
        catch (error) {
            throw new EthereumError(`Could not fetch dlcBTC balance: ${error}`);
        }
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
            return await this.ethereumContracts.dlcBTCContract.totalSupply().toNumber();
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
