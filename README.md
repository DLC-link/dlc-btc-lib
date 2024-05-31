# Coming Soon

## Ethereum

### Interacting with the DLC Smart Contracts

TThe DLC-related smart contracts are currently deployed on the Arbitrum and Arbitrum Sepolia chains. To interact with these contracts and mint dlcBTC Tokens, you'll need to use an instance of the EthereumHandler class. This object facilitates interaction with the deployed smart contracts.

The three contracts you'll need to interact with are named: 'TokenManager', 'DLCManager', and 'DLCBTC'.

To create an EthereumHandler object, you need to provide the following parameters:

- Deployment plans for all three contracts
- The Ethereum Private Key of your Wallet or a Provider for an external Ethereum wallet (e.g., MetaMask)
- The Ethereum Node API URL for write interactions
- [OPTIONAL] The Ethereum Node API URL for read interactions (if not provided, the write API will be used for reading as well)

```ts
import { EthereumHandler } from 'dlc-btc-lib';

const ethereumHandler = new EthereumHandler(
  deploymentPlans, // Deployment plans for all three contracts
  ethereumPrivateKey, // The Ethereum Private Key of your wallet or a provider for an external Ethereum wallet (e.g., MetaMask)
  ethereumNodeAPI, // The Ethereum Node API URL for write interactions
  ethereumReadOnlyNodeAPI // [OPTIONAL] The Ethereum Node API URL for read interactions
);
```

After the Ethereum Handler is setup, you can interact with the smart contracts using the following methods:

```ts
async getAllVaults(): Promise<RawVault[]> // Returns all the User's Vaults
async getRawVault(vaultUUID: string): Promise<RawVault> // Returns the Vault with the specified UUID
async setupVault(bitcoinDepositAmount: number): Promise<any | undefined> // Sets up a new Vault and returns a Transaction Receipt
async closeVault(vaultUUID: string): Promise<any | undefined> // Closes the Vault with the specified UUID and returns a Transaction Receipt
async getDLCBTCBalance(): Promise<number | undefined> // Returns the User's dlcBTC balance
async getAttestorGroupPublicKey(): Promise<string> // Returns the Group Public Key of the Attestors for Bitcoin transactions
```

### Reading the DLC Smart Contracts

If you would like to only read the data from the smart contracts, you can use the ReadOnlyEthereumHandler class. This object facilitates reading data from the deployed smart contracts.

To create an ReadOnlyEthereumHandler object, you need to provide the following parameters:

- Deployment plans for all three contracts
- The Ethereum Node API URL for read interactions

```ts
const readOnlyEthereumHandler = new ReadOnlyEthereumHandler(
  deploymentPlans, // Deployment plans for all three contracts
  ethereumNodeAPI // The Ethereum Node API URL for read interactions
);
```

After the Read Only Ethereum Handler is setup, you can interact with the smart contracts using the following methods:

```ts
async getAttestorGroupPublicKey(): Promise<string> // Returns the Group Public Key of the Attestors for Bitcoin transactions
async getContractTransferEvents(): Promise<Event[]> // Returns all the transfer events from the DLCBTC Contract
async getContractTotalSupply(): Promise<number> // Returns the total supply of dlcBTC Tokens
async getContractFundedVaults(amount: number = 50): Promise<RawVault[]> // Returns all funded Vaults
```
