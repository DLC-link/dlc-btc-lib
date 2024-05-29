/** @format */
import { Wallet, providers } from 'ethers';

import { getEthereumContracts, getProvider } from '../functions/ethereum-functions.js';
import { EthereumError } from '../models/errors.js';
import {
  DLCEthereumContracts,
  EthereumDeploymentPlan,
  RawVault,
} from '../models/ethereum-models.js';

export class EthereumHandler {
  private ethereumContracts: DLCEthereumContracts;

  constructor(
    ethereumDeploymentPlans: EthereumDeploymentPlan[],
    ethereumPrivateKeyOrProvider: string | providers.JsonRpcSigner,
    rpcEndpoint: string,
    readOnlyRPCEndpoint?: string
  ) {
    let signer: Wallet | providers.JsonRpcSigner;
    const readOnlyProvider = getProvider(readOnlyRPCEndpoint ?? rpcEndpoint);
    if (typeof ethereumPrivateKeyOrProvider === 'string') {
      const provider = getProvider(rpcEndpoint);
      signer = new Wallet(ethereumPrivateKeyOrProvider, provider);
    } else {
      signer = ethereumPrivateKeyOrProvider;
    }

    this.ethereumContracts = getEthereumContracts(
      ethereumDeploymentPlans,
      signer,
      readOnlyProvider
    );
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
    const vault: RawVault =
      await this.ethereumContracts.readOnlyProtocolContract.getVault(vaultUUID);
    if (!vault) throw new Error('Vault not found');
    return vault;
  }

  async setupVault(bitcoinDepositAmount: number): Promise<any | undefined> {
    try {
      await this.ethereumContracts.protocolContract.callStatic.setupVault(bitcoinDepositAmount);
      const transaction =
        await this.ethereumContracts.protocolContract.setupVault(bitcoinDepositAmount);
      return await transaction.wait();
    } catch (error: any) {
      throw new EthereumError(`Could not setup Vault: ${error}`);
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
      return await this.ethereumContracts.dlcBTCContract.balanceOf(userAddress);
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
}
