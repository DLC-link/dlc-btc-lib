import { Wallet, providers } from 'ethers';

import {
  getAddressDLCBTCBalance,
  getAllAddressVaults,
  getAttestorGroupPublicKey,
  getContractVaults,
  getDLCBTCTotalSupply,
  getEthereumContracts,
  getLockedBTCBalance,
  getProvider,
  getRawVault,
  isUserWhitelisted,
  isWhitelistingEnabled,
  setupVault,
  withdraw,
} from '../functions/ethereum/ethereum-functions.js';
import { EthereumError, EthereumHandlerError } from '../models/errors.js';
import {
  DLCEthereumContracts,
  EthereumDeploymentPlan,
  RawVault,
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

  async getAllUserVaults(): Promise<RawVault[]> {
    try {
      const userAddress = await this.ethereumContracts.dlcManagerContract.signer.getAddress();
      return await getAllAddressVaults(this.ethereumContracts.dlcManagerContract, userAddress);
    } catch (error) {
      throw new EthereumHandlerError(`Could not fetch all User Vaults: ${error}`);
    }
  }

  async getRawVault(vaultUUID: string): Promise<RawVault> {
    try {
      return await getRawVault(this.ethereumContracts.dlcManagerContract, vaultUUID);
    } catch (error) {
      throw new EthereumHandlerError(`Could not fetch User Vault: ${error}`);
    }
  }

  async setupVault(): Promise<any | undefined> {
    try {
      return await setupVault(this.ethereumContracts.dlcManagerContract);
    } catch (error) {
      throw new EthereumHandlerError(`Could not setup Vault for User: ${error}`);
    }
  }

  async withdraw(vaultUUID: string, withdrawAmount: bigint) {
    try {
      return await withdraw(this.ethereumContracts.dlcManagerContract, vaultUUID, withdrawAmount);
    } catch (error) {
      throw new EthereumHandlerError(`Unable to perform Withdraw for User: ${error}`);
    }
  }

  async getUserDLCBTCBalance(): Promise<number | undefined> {
    try {
      const userAddress = await this.ethereumContracts.dlcManagerContract.signer.getAddress();
      return await getAddressDLCBTCBalance(this.ethereumContracts.dlcBTCContract, userAddress);
    } catch (error) {
      throw new EthereumHandlerError(`Could not fetch User's dlcBTC balance: ${error}`);
    }
  }

  async getDLCBTCTotalSupply(): Promise<number> {
    try {
      return await getDLCBTCTotalSupply(this.ethereumContracts.dlcBTCContract);
    } catch (error) {
      throw new EthereumHandlerError(`Could not fetch Total Supply of dlcBTC: ${error}`);
    }
  }

  async getLockedBTCBalance(userVaults?: RawVault[]): Promise<number> {
    try {
      if (!userVaults) {
        userVaults = await this.getAllUserVaults();
      }
      return await getLockedBTCBalance(userVaults);
    } catch (error) {
      throw new EthereumHandlerError(`Could not fetch Total Supply of Locked dlcBTC: ${error}`);
    }
  }

  async getAttestorGroupPublicKey(): Promise<string> {
    try {
      return getAttestorGroupPublicKey(this.ethereumContracts.dlcManagerContract);
    } catch (error) {
      throw new EthereumHandlerError(`Could not fetch Attestor Public Key: ${error}`);
    }
  }

  async isWhiteLisingEnabled(): Promise<boolean> {
    try {
      return await isWhitelistingEnabled(this.ethereumContracts.dlcManagerContract);
    } catch (error) {
      throw new EthereumHandlerError(`Could not fetch Whitelisting Status: ${error}`);
    }
  }

  async isUserWhitelisted(): Promise<boolean> {
    try {
      const userAddress = await this.ethereumContracts.dlcManagerContract.signer.getAddress();
      return await isUserWhitelisted(this.ethereumContracts.dlcManagerContract, userAddress);
    } catch (error) {
      throw new EthereumHandlerError(`Could not fetch User Whitelisting Status: ${error}`);
    }
  }

  async getContractVaults(amount: number = 50): Promise<RawVault[]> {
    try {
      return await getContractVaults(this.ethereumContracts.dlcManagerContract, amount);
    } catch (error) {
      throw new EthereumError(`Could not fetch All Vaults: ${error}`);
    }
  }
}
