import { Event, Wallet, providers } from 'ethers';

import { getEthereumContracts, getProvider } from '../functions/ethereum/ethereum-functions.js';
import { EthereumError } from '../models/errors.js';
import {
  DLCEthereumContractName,
  DLCEthereumContracts,
  EthereumDeploymentPlan,
  RawVault,
  VaultState,
} from '../models/ethereum-models.js';

export class EthereumHandler {
  private ethereumContracts: DLCEthereumContracts;

  private constructor(ethereumContracts: DLCEthereumContracts) {
    this.ethereumContracts = ethereumContracts;
  }

  static fromPrivateKey(
    ethereumDeploymentPlans: EthereumDeploymentPlan[],
    ethereumPrivateKey: string,
    rpcEndpoint: string
  ): EthereumHandler {
    const provider = getProvider(rpcEndpoint);
    const signer = new Wallet(ethereumPrivateKey, provider);
    const ethereumContracts = getEthereumContracts(ethereumDeploymentPlans, signer);
    return new EthereumHandler(ethereumContracts);
  }

  static fromSigner(
    ethereumDeploymentPlans: EthereumDeploymentPlan[],
    signer: providers.JsonRpcSigner
  ): EthereumHandler {
    const ethereumContracts = getEthereumContracts(ethereumDeploymentPlans, signer);
    return new EthereumHandler(ethereumContracts);
  }

  getContracts(): DLCEthereumContracts {
    return this.ethereumContracts;
  }

  async getAllVaults(): Promise<RawVault[]> {
    try {
      const userAddress = await this.ethereumContracts.protocolContract.signer.getAddress();
      return await this.ethereumContracts.protocolContract.getAllVaultsForAddress(userAddress);
    } catch (error) {
      throw new EthereumError(`Could not fetch Vaults: ${error}`);
    }
  }

  async getRawVault(vaultUUID: string): Promise<RawVault> {
    const vault: RawVault = await this.ethereumContracts.protocolContract.getVault(vaultUUID);
    if (!vault) throw new Error('Vault not found');
    return vault;
  }

  async setupVault(): Promise<any | undefined> {
    try {
      await this.ethereumContracts.protocolContract.callStatic.setupVault();
      const transaction = await this.ethereumContracts.protocolContract.setupVault();
      return await transaction.wait();
    } catch (error: any) {
      throw new EthereumError(`Could not setup Vault: ${error}`);
    }
  }

  async withdraw(vaultUUID: string, amount: bigint) {
    try {
      await this.ethereumContracts.protocolContract.callStatic.withdraw(vaultUUID, amount);
      const transaction = await this.ethereumContracts.protocolContract.withdraw(vaultUUID, amount);
      return await transaction.wait();
    } catch (error: any) {
      throw new EthereumError(`Unable to perform withdraw: ${error}`);
    }
  }

  async closeVault(vaultUUID: string) {
    try {
      await this.ethereumContracts.protocolContract.callStatic.closeVault(vaultUUID);
      const transaction = await this.ethereumContracts.protocolContract.closeVault(vaultUUID);
      return await transaction.wait();
    } catch (error: any) {
      throw new EthereumError(`Could not close Vault: ${error}`);
    }
  }

  async getDLCBTCBalance(): Promise<number | undefined> {
    try {
      const userAddress = await this.ethereumContracts.protocolContract.signer.getAddress();
      const balance = await this.ethereumContracts.dlcBTCContract.balanceOf(userAddress);
      return balance.toNumber();
    } catch (error) {
      throw new EthereumError(`Could not fetch dlcBTC balance: ${error}`);
    }
  }

  async getAttestorGroupPublicKey(): Promise<string> {
    try {
      const attestorGroupPubKey =
        await this.ethereumContracts.dlcManagerContract.attestorGroupPubKey();
      if (!attestorGroupPubKey) throw new Error('Could not get Attestor Group Public Key');
      return attestorGroupPubKey;
    } catch (error) {
      throw new EthereumError(`Could not fetch Attestor Public Key: ${error}`);
    }
  }

  async getContractTransferEvents(contractName: DLCEthereumContractName): Promise<Event[]> {
    try {
      switch (contractName) {
        case 'DLCBTC':
          return await this.ethereumContracts.dlcBTCContract.queryFilter(
            this.ethereumContracts.dlcBTCContract.filters.Transfer()
          );
        case 'DLCManager':
          return await this.ethereumContracts.dlcManagerContract.queryFilter(
            this.ethereumContracts.dlcManagerContract.filters.Transfer()
          );
        case 'TokenManager':
          return await this.ethereumContracts.protocolContract.queryFilter(
            this.ethereumContracts.protocolContract.filters.Transfer()
          );
        default:
          throw new Error('Invalid Contract Name');
      }
    } catch (error: any) {
      throw new EthereumError(`Could not fetch Transfer Events: ${error}`);
    }
  }

  async getContractTotalSupply(): Promise<number> {
    try {
      return await this.ethereumContracts.dlcBTCContract.totalSupply().toNumber();
    } catch (error: any) {
      throw new EthereumError(`Could not fetch Total Supply: ${error}`);
    }
  }

  async getContractFundedVaults(amount: number = 50): Promise<RawVault[]> {
    try {
      let totalFetched = 0;
      const fundedVaults: RawVault[] = [];

      let shouldContinue = true;
      while (shouldContinue) {
        const fetchedVaults: RawVault[] =
          await this.ethereumContracts.dlcManagerContract.getAllDLCs(
            totalFetched,
            totalFetched + amount
          );
        const filteredVaults = fetchedVaults.filter(vault => vault.status === VaultState.FUNDED);
        fundedVaults.push(...filteredVaults);

        totalFetched += amount;
        shouldContinue = fetchedVaults.length === amount;
      }

      return fundedVaults;
    } catch (error) {
      throw new EthereumError(
        `Could not fetch Funded Vaults: ${error instanceof Error ? error.message : error}`
      );
    }
  }
}
