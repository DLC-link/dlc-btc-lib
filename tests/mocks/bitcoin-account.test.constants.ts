// Test Account 1 [Native Segwit]
export const TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_ADDRESS_1 =
  'bcrt1qd7c30f36p9wauhnxyvvsglsmhveydlpaqrz6md';
export const TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_FINGERPRINT_1 = '658a4dd0';
export const TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_MNEMONIC_1 =
  'eternal unusual lava army roast joy pact knife book boring flame wrap retreat false dizzy peanut giraffe purpose border pride oblige possible surround grit';
export const TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_XPRIV_1 =
  'tprv8ZgxMBicQKsPeLTYcChqE6UbJWgchiXXdMHrmbuBQyrS74cQeWde7w6C7htZJBuFBxXpppvRyjPHZD17GHGiY82mGhf5yMDAoX1cqNkLxiP';
export const TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_PUBLIC_KEY_1 =
  '0246136ae941f2e810032f01f3545b56b9590cf4a29b67125d3e35916ecce34824';

export const TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_UTXOS_1 = [
  {
    type: 'wpkh',
    script: Uint8Array.from([
      0, 20, 111, 177, 23, 166, 58, 9, 93, 222, 94, 102, 35, 25, 4, 126, 27, 187, 50, 70, 252, 61,
    ]),
    address: 'bcrt1qd7c30f36p9wauhnxyvvsglsmhveydlpaqrz6md',
    txid: 'abb220f97c47289175af1ca1d199c19c9c37190bc6ea651e69e04cbd09f19501',
    index: 0,
    value: 100000000,
    witnessUtxo: {
      script: Uint8Array.from([
        0, 20, 111, 177, 23, 166, 58, 9, 93, 222, 94, 102, 35, 25, 4, 126, 27, 187, 50, 70, 252, 61,
      ]),
      amount: 100000000n,
    },
    redeemScript: undefined,
  },
];

// Test Account 2 [Taproot]
export const TEST_BITCOIN_REGTEST_TAPROOT_ADDRESS_1 =
  'bcrt1parwpen3d4qy20r958p73dh34963628wmhmyynpewuh4jxtazjyms07xejy';
export const TEST_BITCOIN_REGTEST_TAPROOT_FINGERPRINT_1 = '4fc36ddd';
export const TEST_BITCOIN_REGTEST_TAPROOT_MNEMONIC_1 =
  'stuff swim subway brush rice charge female express pride shoot coil canyon gorilla agent waste much limit kiss settle employ extend high swallow ghost';
export const TEST_BITCOIN_REGTEST_TAPROOT_XPRIV_1 =
  'tprv8ZgxMBicQKsPdTyjFcdrTeCPBWtCi7rkhgGJmRL6FFvuoVs64nBgwVwaMYekqJZScKCYXVfaq9g3t8CjNauFScbfruRrnub2BD2qxULPwqQ';
export const TEST_BITCOIN_REGTEST_TAPROOT_PUBLIC_KEY_1 =
  '03f5963cfb8abe2b2673ed20831d921e4403b9e5cef66b4d54c5cfb91e8f6bc3c4';
