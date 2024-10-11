import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';

import { LedgerDLCHandler } from './dlc-handlers/ledger-dlc-handler.js';
import { PrivateKeyDLCHandler } from './dlc-handlers/private-key-dlc-handler.js';
import { SoftwareWalletDLCHandler } from './dlc-handlers/software-wallet-dlc-handler.js';
import { EthereumHandler } from './network-handlers/ethereum-handler.js';
import { ProofOfReserveHandler } from './proof-of-reserve-handlers/proof-of-reserve-handler.js';

export {
  PrivateKeyDLCHandler,
  LedgerDLCHandler,
  SoftwareWalletDLCHandler,
  EthereumHandler,
  ProofOfReserveHandler,
  bitcoin,
  testnet,
  regtest,
};
