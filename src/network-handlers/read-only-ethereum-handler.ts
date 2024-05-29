/** @format */
import { Event } from 'ethers';

import { getProvider, getReadOnlyEthereumContracts } from '../functions/ethereum-functions.js';
import { EthereumError } from '../models/errors.js';
import {
  DLCReadOnlyEthereumContracts,
  EthereumDeploymentPlan,
  RawVault,
  VaultState,
} from '../models/ethereum-models.js';

export class ReadOnlyEthereumHandler {
  private ethereumContracts: DLCReadOnlyEthereumContracts;

  constructor(ethereumDeploymentPlans: EthereumDeploymentPlan[], rpcEndpoint: string) {
    this.ethereumContracts = getReadOnlyEthereumContracts(
      ethereumDeploymentPlans,
      getProvider(rpcEndpoint)
    );
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

  async getContractTransferEvents(): Promise<Event[]> {
    try {
      const eventFilter = this.ethereumContracts.dlcBTCContract.filters.Transfer();
      return await this.ethereumContracts.dlcBTCContract.queryFilter(eventFilter);
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

      while (true) {
        const fetchedVaults: RawVault[] =
          await this.ethereumContracts.dlcManagerContract.getAllDLCs(
            totalFetched,
            totalFetched + amount
          );
        fundedVaults.push(...fetchedVaults.filter(vault => vault.status === VaultState.Funded));
        totalFetched += amount;
        if (fetchedVaults.length !== amount) break;
      }
      return fundedVaults;
    } catch (error: any) {
      throw new EthereumError(`Could not fetch Funded Vaults: ${error}`);
    }
  }
}
