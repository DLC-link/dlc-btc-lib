import { regtest } from 'bitcoinjs-lib/src/networks.js';
import { BigNumber } from 'ethers';

import { BitcoinTransaction } from '../../src/models/bitcoin-models.js';
import { RawVault } from '../../src/models/ethereum-models.js';

// Bitcoin
export const TEST_BITCOIN_NETWORK = regtest;
export const TEST_BITCOIN_ADDRESS = 'bcrt1q4htslvp40rf6epd2hqyfww2mkprzy0yjmagsy5';
export const TEST_BITCOIN_EXTENDED_PRIVATE_KEY =
  'tprv8ZgxMBicQKsPeJ7iQfVEb34R3JoSyJ1J9z6wv1yXJkd1NMTRbmQiLkcZXgqQ277LMtszhnp2L2VmmHhFzoLD12fjyXcAvfnvs6qTJMMcKFq';
export const TEST_BITCOIN_WALLET_ACCOUNT_INDEX = 0;
export const TEST_BITCOIN_BLOCKCHAIN_API = 'https://devnet.dlc.link/electrs';
export const TEST_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API =
  'https://devnet.dlc.link/electrs/fee-estimates';
export const TEST_BITCOIN_AMOUNT = 0.01;
export const TEST_FUNDING_PAYMENT_TYPE = 'tr';

// Ethereum
export const TEST_ETHEREUM_PRIVATE_KEY = '';
export const TEST_ETHEREUM_NODE_API = 'https://sepolia-rollup.arbitrum.io/rpc';
export const TEST_ETHEREUM_READ_ONLY_NODE_API = 'https://sepolia-rollup.arbitrum.io/rpc';
export const TEST_ETHEREUM_GITHUB_DEPLOYMENT_PLAN_ROOT_URL =
  'https://raw.githubusercontent.com/DLC-link/dlc-solidity';
export const TEST_ETHEREUM_DEVNET_GITHUB_DEPLOYMENT_PLAN_BRANCH = 'dev';
export const TEST_ETHEREUM_ATTESTOR_CHAIN_ID = 'evm-arbsepolia';
export const TEST_VAULT: RawVault = {
  uuid: '0x400ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc962',
  protocolContract: '0x6e692DB944162f8b4250aA25eCEe80608457D7a7',
  timestamp: BigNumber.from('0x665da025'),
  valueLocked: BigNumber.from('0x0f4240'),
  valueMinted: BigNumber.from('0x0f4240'),
  creator: '0x0DD4f29E21F10cb2E485cf9bDAb9F2dD1f240Bfa',
  status: 0,
  fundingTxId: '',
  closingTxId: '',
  wdTxId: '',
  btcFeeRecipient: '031131cd88bcea8c1d84da8e034bb24c2f6e748c571922dc363e7e088f5df0436c',
  btcMintFeeBasisPoints: BigNumber.from('0x64'),
  btcRedeemFeeBasisPoints: BigNumber.from('0x64'),
  taprootPubKey: '',
};

// Attestor
export const TEST_REGTEST_ATTESTOR_APIS = [
  'https://devnet.dlc.link/attestor-1',
  'https://devnet.dlc.link/attestor-2',
  'https://devnet.dlc.link/attestor-3',
];

export const TEST_TESTNET_FUNDING_TRANSACTION: BitcoinTransaction = {
  txid: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: 'cefbeafc3e50618a59646ba6e7b3bba8f15b3e2551570af98182f4234586d085',
      vout: 2,
      prevout: {
        scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
        value: 71607616,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        'd4ad3523fdc9ec709e8bf2ecadd56c9266f9c57bccb5d165cd57dc815a88de34957764482a6fab3897ce7be2677168f69be93d799021b502899b556436c3f6bb',
      ],
      is_coinbase: false,
      sequence: 4294967280,
    },
  ],
  vout: [
    {
      scriptpubkey: '51206d7e5019c795d05fd3df81713069aa3a309e912a61555ab3ebd6e477f42c1f70',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 6d7e5019c795d05fd3df81713069aa3a309e912a61555ab3ebd6e477f42c1f70',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1pd4l9qxw8jhg9l57ls9cnq6d28gcfayf2v9244vlt6mj80apvracqgdt090',
      value: 10000000,
    },
    {
      scriptpubkey: '0014f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'tb1q728vrglrmupypwv9st98w48xjj8fh7fs8mrdre',
      value: 100000,
    },
    {
      scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
      value: 61490226,
    },
  ],
  size: 236,
  weight: 740,
  fee: 17390,
  status: {
    confirmed: true,
    block_height: 2867279,
    block_hash: '000000000000001ee12e0297ff36e8c8041aefb65af0c1033a1af4fdb8146f0d',
    block_time: 1720620175,
  },
};

export const TEST_VAULT_2: RawVault = {
  uuid: '0x2b898d65df757575417a920aabe518586793bac4fa682f00ad2c33fad2471999',
  protocolContract: '0x980feAeD0D5d3BaFFeb828a27e8b59c0FE78F1f9',
  timestamp: BigNumber.from('0x668e9353'),
  valueLocked: BigNumber.from('0x989680'),
  valueMinted: BigNumber.from('0x989680'),
  creator: '0x980feAeD0D5d3BaFFeb828a27e8b59c0FE78F1f9',
  status: 1,
  fundingTxId: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
  closingTxId: '',
  wdTxId: '032392b61a5c3b0098774465ad61e429fd892615ff2890f849f8eb237a8a59f3ba',
  btcFeeRecipient: '',
  btcMintFeeBasisPoints: BigNumber.from('0x64'),
  btcRedeemFeeBasisPoints: BigNumber.from('0x64'),
  taprootPubKey: 'dc544c17af0887dfc8ca9936755c9fdef0c79bbc8866cd69bf120c71509742d2',
};
