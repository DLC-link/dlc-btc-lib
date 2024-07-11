import { BitcoinTransaction } from '../../src/models/bitcoin-models';

export const TEST_TAPROOT_UNHARDENED_DERIVED_PUBLIC_KEY_1 =
  'dc544c17af0887dfc8ca9936755c9fdef0c79bbc8866cd69bf120c71509742d2';

export const TEST_TAPROOT_MULTISIG_PAYMENT_SCRIPT_1 =
  '51206d7e5019c795d05fd3df81713069aa3a309e912a61555ab3ebd6e477f42c1f70';

export const TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1 = 2867441;
export const TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_2 = 2867285;

export const TEST_UNSPENDABLE_KEY_COMMITED_TO_UUID_1 =
  'tpubD6NzVbkrYhZ4Wmm9QfhLLpfzQRoJApR3Sf4AgkiyLMgxbhPtBLVmqA2ZG7zKTgYzzCCK7bAoS5UEXotNdAnhhQhUhB1Q1uqFF1BLVCkArmr';

export const TEST_UNHARDENED_DERIVED_UNSPENDABLE_KEY_COMMITED_TO_UUID_1 =
  '02b733c776dd7776657c20a58f1f009567afc75db226965bce83d5d0afc29e46c9';

// This is a testnet funding transaction with valid inputs and outputs
export const TEST_TESTNET_FUNDING_TRANSACTION_1: BitcoinTransaction = {
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

// This transaction is missing the output with the multisig's script.
export const TEST_TESTNET_FUNDING_TRANSACTION_2: BitcoinTransaction = {
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

// This transaction's multisig output value does not match the vault's valueLocked field.
export const TEST_TESTNET_FUNDING_TRANSACTION_3: BitcoinTransaction = {
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
      value: 5000000,
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
