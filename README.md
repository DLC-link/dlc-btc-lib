# dlc-btc-lib

**dlc-btc-lib** is a comprehensive library for interacting with DLC.Link smart contracts and the Bitcoin blockchain. It includes functions for creating valid Partially Signed Bitcoin Transactions, handling setup, deposit, and withdrawal interactions, and interfacing with Attestors. This library provides all the essential tools and utilities for seamless blockchain and smart contract interactions.

## Fee Rate Calculation

The transaction fee rate is calculated by taking the maximum value among three metrics from the Bitcoin blockchain:

- Average fee rate from the last two blocks
- Current mempool block's median fee rate
- Estimated "fastest" fee rate

Each metric is adjusted by an optional multiplier (defaults to 1.0) and the final result is rounded up to the nearest whole number. For regtest environments, a fixed fee rate of 2 is used.
