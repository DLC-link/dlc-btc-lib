import { Event } from 'ethers';

import {
  getProvider,
  getReadOnlyEthereumContracts,
} from '../functions/ethereum/ethereum-functions.js';
import { EthereumError } from '../models/errors.js';
import {
  DLCEthereumContractName,
  DLCEthereumContracts,
  EthereumDeploymentPlan,
  RawVault,
  VaultState,
} from '../models/ethereum-models.js';

export class ReadOnlyEthereumHandler {
  private ethereumContracts: DLCEthereumContracts;

  constructor(ethereumDeploymentPlans: EthereumDeploymentPlan[], rpcEndpoint: string) {
    this.ethereumContracts = getReadOnlyEthereumContracts(
      ethereumDeploymentPlans,
      getProvider(rpcEndpoint)
    );
  }

  getContracts(): DLCEthereumContracts {
    return this.ethereumContracts;
  }

  async getRawVault(vaultUUID: string): Promise<RawVault> {
    const vault: RawVault = await this.ethereumContracts.dlcManagerContract.getVault(vaultUUID);
    if (!vault) throw new Error('Vault not found');
    return vault;
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
        default:
          throw new Error('Invalid Contract Name');
      }
    } catch (error: any) {
      throw new EthereumError(`Could not fetch Transfer Events: ${error}`);
    }
  }

  async getContractTotalSupply(): Promise<number> {
    try {
      const totalSupply = await this.ethereumContracts.dlcBTCContract.totalSupply();
      return totalSupply.toNumber();
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
