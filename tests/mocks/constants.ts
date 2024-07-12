import { regtest } from 'bitcoinjs-lib/src/networks.js';
import { BigNumber } from 'ethers';

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
export const TEST_REGTEST_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY =
  'tpubDDqN2CmTDKaGeqXMayfCZEvjZqntifi4r1ztmRWsGuE1VE4bosR3mBKQwVaCxZcmg8R1nHDMDzDmzjoccBMgwZV1hhz51tAXVnhjABCQcwA';

export const TEST_ALICE_NATIVE_SEGWIT_PAYMENT_SCRIPT_1 =
  '0014add70fb03578d3ac85aab80897395bb046223c92';

export const TEST_ALICE_NATIVE_SEGWIT_PUBLIC_KEY_1 =
  '02f4d8696f9b275f4e10af63f03bcb7fbba7b1ed44dd9b12a973c8d20212beb8d1';

export const TEST_ALICE_NATIVE_SEGWIT_PUBLIC_KEY_2 =
  '0385c8f8844b7c197b96d933b01b2b82b97b9f9d55c81947e1db5cfb3de375508b';

export const TEST_ALICE_TAPROOT_PUBLIC_KEY_1 =
  '03bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfc';

export const TEST_ALICE_TAPROOT_PUBLIC_KEY_2 =
  '03940f5559dc92a3253e8699e9c632badfe5c2b1a13a113b85022d30cdab9c0ed8';
