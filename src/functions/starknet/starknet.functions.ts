import { Account, Call, Contract, RpcProvider, constants, num } from 'starknet';

import { StarknetError } from '../../models/errors.js';
import { RawVault } from '../../models/ethereum-models.js';
import { customShiftValue } from '../../utilities/index.js';

/**
 * Get a Starknet contract instance.
 * @param nodeURL - The URL of the Starknet node.
 * @param address - The address of the contract.
 * @returns A Starknet contract instance.
 */
export async function getStarknetContract(nodeURL: string, address: string): Promise<Contract> {
  const provider = new RpcProvider({ nodeUrl: nodeURL });
  const { abi } = await provider.getClassAt(address);

  if (!abi) throw new StarknetError('ABI not available for contract');

  return new Contract(abi, address, provider);
}

/**
 * Get a Starknet account instance.
 * @param nodeURL - The URL of the Starknet node.
 * @param address - The address of the account.
 * @param privateKey - The private key of the account.
 * @returns A Starknet account instance.
 */
export function getStarknetAccount(nodeURL: string, address: string, privateKey: string): Account {
  const provider = new RpcProvider({ nodeUrl: nodeURL });
  return new Account(provider, address, privateKey, undefined, constants.TRANSACTION_VERSION.V3);
}

/**
 * Populate a Starknet transaction.
 * @param contract - The contract to populate.
 * @param functionName - The name of the function to populate.
 * @param args - The arguments to populate the transaction with.
 * @returns A populated Starknet transaction.
 */
export async function populateTransaction(contract: Contract, functionName: string, args: any[]) {
  return contract.populate(functionName, args);
}

/**
 * Execute a Starknet transaction and wait for it to be confirmed.
 * @param account - The account to execute the transaction on.
 * @param call - The call to execute.
 * @returns The transaction hash.
 */
export async function executeAndWaitForTransaction(account: Account, call: Call) {
  const maxQtyGasAuthorized = 1800n;
  const maxPricePerUnitGasAuthorized = 100n * 10n ** 9n;
  const { transaction_hash } = await account.execute(call, {
    version: 3,
    paymasterData: [],
    resourceBounds: {
      l1_gas: {
        max_amount: num.toHex(maxQtyGasAuthorized),
        max_price_per_unit: num.toHex(maxPricePerUnitGasAuthorized),
      },
      l2_gas: {
        max_amount: num.toHex(0),
        max_price_per_unit: num.toHex(0),
      },
    },
  });
  const transactionReceipt = await account.waitForTransaction(transaction_hash);

  if (transactionReceipt.isSuccess()) return transactionReceipt;

  console.log('Transaction failed', transactionReceipt);

  throw new StarknetError('Transaction failed', transactionReceipt);
}

/**
 * Get the balance of either STRK or ETH.
 * @param tokenContract - The contract to get the balance of.
 * @param address - The address to get the balance of.
 * @returns The balance of the token.
 */
export async function getFeeTokenBalance(tokenContract: Contract, address: string) {
  return customShiftValue(await tokenContract.balanceOf(address), 18, true);
}

export async function getIBTCBalance(tokenContract: Contract, address: string) {
  return customShiftValue(await tokenContract.balance_of(address), 18, true);
}

/**
 * Get the vaults for an address.
 * @param contract - The vault manager contract to get the vaults from.
 * @param address - The address to get the vaults for.
 * @returns The vaults for the address.
 */
export async function getVaultsForAddress(
  contract: Contract,
  address: string
): Promise<RawVault[]> {
  return await contract.get_all_vaults_for_address(address);
}

/**
 * Get a vault by its UUID.
 * @param contract - The contract to get the vault from.
 * @param vaultUUID - The UUID of the vault to get.
 * @returns The vault.
 */
export async function getVault(contract: Contract, vaultUUID: string): Promise<any> {
  return await contract.get_vault(vaultUUID);
}

/**
 * Set the minter on a token contract.
 * @param deployerAccount - The account to set the minter on.
 * @param contract - The contract to set the minter on.
 * @param minterAddress - The address of the minter.
 */
export async function setMinterOnTokenContract(
  deployerAccount: Account,
  contract: Contract,
  minterAddress: string
) {
  const call = await populateTransaction(contract, 'set_minter_on_token_contract', [minterAddress]);
  return await executeAndWaitForTransaction(deployerAccount, call);
}

/**
 * Mint tokens on a token contract.
 * @param minterAccount - The account to mint the tokens on.
 * @param contract - The contract to mint the tokens on.
 * @param recipientAddress - The address of the recipient.
 * @param amount - The amount of tokens to mint.
 */
export async function mintTokens(
  minterAccount: Account,
  contract: Contract,
  recipientAddress: string,
  amount: string
) {
  const call = await populateTransaction(contract, 'mint', [recipientAddress, amount]);
  return await executeAndWaitForTransaction(minterAccount, call);
}
