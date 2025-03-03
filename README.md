# dlc-btc-lib

**dlc-btc-lib** is a comprehensive library for interacting with DLC.Link smart contracts and the Bitcoin blockchain. It includes functions for creating valid Partially Signed Bitcoin Transactions, handling setup, deposit, and withdrawal interactions, and interfacing with Attestors. This library provides all the essential tools and utilities for seamless blockchain and smart contract interactions.

## Fee Rate Calculation

The transaction fee rate is calculated by taking the maximum value among three metrics from the Bitcoin blockchain:

- Average fee rate from the last two blocks `/api/v1/mining/blocks/fee-rates/24h`
- Current mempool block's median fee rate `/api/v1/fees/mempool-blocks`
- Recommended "fastest" fee rate by API `/api/v1/fees/recommended`

Each metric is adjusted by an optional multiplier (defaults to 1.0) and the final result is rounded up to the nearest whole number. For regtest environments, a fixed fee rate of 2 is used.

## Proof of Reserve Calculation

The Proof of Reserve system verifies and calculates the total value of Bitcoin deposits across all vaults. This is handled by the `ProofOfReserveHandler` class which:

1. Takes a list of vaults and verifies each vault's deposit by:

   - Checking for valid transaction IDs (either funding or withdraw-deposit)
   - Fetching the transaction from the Bitcoin blockchain
   - Confirming the transaction has sufficient confirmations
   - Calculating the vault's output value in satoshis

2. Aggregates the verified deposit values to determine the total Bitcoin reserves

The handler requires:

- Bitcoin blockchain API endpoint for transaction lookups
- Bitcoin network object (mainnet/testnet/regtest)
- Extended public key of the attestor group for validating vault payments

Example usage:

```typescript
import { RawVault } from './models/ethereum-models';
import { testnet } from 'bitcoinjs-lib/src/networks.js';
import { ProofOfReserveHandler } from './proof-of-reserve-handlers/proof-of-reserve-handler';

const vaults: RawVault[] = [...];

const extendedAttestorGroupPublicKey = 'tpubDDRekL64eJJav32TLhNhG59qra7wAMaei8YMGXNiJE8ksdYrKgvaFM1XG6JrSt31W97XryScrX37RUEujjZT4qScNf8Zu1JxWj4VYkwz4rU';
const bitcoinBlockchainAPI = 'https://testnet.dlc.link/electrs';
const bitcoinNetwork = testnet;

// Instantiate the Proof of Reserve handler
const proofOfReserveHandler = new ProofOfReserveHandler(bitcoinBlockchainAPI, bitcoinNetwork, extendedAttestorGroupPublicKey);

// Function to calculate and verify reserves
async function calculateAndVerifyReserves() {
  try {
    const totalReservesInSats = await proofOfReserveHandler.calculateProofOfReserve(vaults);
    console.log(`Total reserves in satoshis: ${totalReservesInSats}`);
  } catch (error) {
    console.error('Error calculating reserves:', error);
  }
}
```
