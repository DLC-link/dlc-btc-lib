import { Account, Contract } from 'starknet';

import {
  executeAndWaitForTransaction,
  getFeeTokenBalance,
  getIBTCBalance,
  getStarknetAccount,
  getStarknetContract,
  getVault,
  getVaultsForAddress,
  populateTransaction,
} from '../functions/starknet/starknet.functions.js';

/**
 * The contract addresses for the Starknet contracts to be used in the handler.
 */
interface ContractAddresses {
  [StarknetContract.VAULT_MANAGER]: string;
  [StarknetContract.IBTC]: string;
  [StarknetContract.STRK]: string;
  [StarknetContract.ETH]: string;
}

/**
 * The Starknet contracts to be used in the handler.
 */
export enum StarknetContract {
  VAULT_MANAGER = 0,
  IBTC = 1,
  STRK = 2,
  ETH = 3,
}

/**
 * The Starknet contracts to be used in the handler.
 */
interface Contracts {
  [StarknetContract.VAULT_MANAGER]: Contract;
  [StarknetContract.IBTC]: Contract;
  [StarknetContract.STRK]: Contract;
  [StarknetContract.ETH]: Contract;
}

/**
 * The Starknet handler for a keypair.
 */
export class StarknetKeypairHandler {
  private nodeURL: string;
  private contractAddresses: ContractAddresses;
  private account: Account;
  private contracts: Contracts;

  /**
   * Create a new Starknet handler for a keypair.
   * @param address - The address of the account.
   * @param privateKey - The private key of the account.
   * @param nodeURL - The URL of the Starknet node.
   * @param contractAddresses - The contract addresses to be used in the handler.
   */
  private constructor(
    address: string,
    privateKey: string,
    nodeURL: string,
    contractAddresses: ContractAddresses
  ) {
    this.account = getStarknetAccount(nodeURL, address, privateKey);
    this.nodeURL = nodeURL;
    this.contractAddresses = contractAddresses;
    this.contracts = {} as Contracts;
  }

  getAccount() {
    return this.account;
  }

  /**
   * Create and initialize a new Starknet handler for a keypair.
   * @param address - The address of the account.
   * @param privateKey - The private key of the account.
   * @param nodeURL - The URL of the Starknet node.
   * @param contractAddresses - The contract addresses to be used in the handler.
   */
  public static async create(
    address: string,
    privateKey: string,
    nodeURL: string,
    contractAddresses: ContractAddresses
  ): Promise<StarknetKeypairHandler> {
    const instance = new StarknetKeypairHandler(address, privateKey, nodeURL, contractAddresses);
    await instance.initialize();
    return instance;
  }

  /**
   * Initialize the Starknet handler.
   */
  private async initialize() {
    this.contracts = Object.fromEntries(
      await Promise.all(
        [
          StarknetContract.VAULT_MANAGER,
          StarknetContract.IBTC,
          StarknetContract.STRK,
          StarknetContract.ETH,
        ].map(async type => [
          type,
          await getStarknetContract(this.nodeURL, this.contractAddresses[type]),
        ])
      )
    ) as Contracts;

    Object.values(this.contracts).forEach(contract => contract.connect(this.account));
  }

  /**
   * Setup a new vault.
   * @returns The transaction hash.
   */
  async setupVault() {
    return await executeAndWaitForTransaction(
      this.account,
      await populateTransaction(this.contracts[StarknetContract.VAULT_MANAGER], 'setup_vault', [])
    );
  }

  /**
   * Withdraw from a vault.
   * @param vaultUUID - The UUID of the vault to withdraw from.
   * @param amount - The amount to withdraw.
   * @returns The transaction hash.
   */
  async withdraw(vaultUUID: string, amount: string) {
    return await executeAndWaitForTransaction(
      this.account,
      await populateTransaction(this.contracts[StarknetContract.VAULT_MANAGER], 'withdraw', [
        vaultUUID,
        amount,
      ])
    );
  }

  /**
   * Get the vaults for an address.
   * @returns The vaults for the address.
   */
  async getVaultsForAddress() {
    return await getVaultsForAddress(
      this.contracts[StarknetContract.VAULT_MANAGER],
      this.account.address
    );
  }

  /**
   * Get the balance of a fee token.
   * @param tokenType - The type of token to get the balance of.
   * @returns The balance of the token.
   */
  async getFeeTokenBalance(
    tokenType: StarknetContract.STRK | StarknetContract.ETH | StarknetContract.IBTC
  ) {
    return await getFeeTokenBalance(this.contracts[tokenType], this.account.address);
  }

  /**
   * Get the balance of the IBTC token.
   * @returns The balance of the IBTC token.
   */
  async getIBTCBalance() {
    return await getIBTCBalance(this.contracts[StarknetContract.IBTC], this.account.address);
  }

  /**
   * Get a vault by its UUID.
   * @param vaultUUID - The UUID of the vault to get.
   * @returns The vault.
   */
  async getVault(vaultUUID: string) {
    return await getVault(this.contracts[StarknetContract.VAULT_MANAGER], vaultUUID);
  }
}
