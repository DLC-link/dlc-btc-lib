/** @format */

// test values for the integration tests
export const TEST_BITCOIN_AMOUNT = 0.001;
export const TEST_FEE_AMOUNT = 0.1;
export const TEST_ATTESTOR_PUBLIC_KEY = '4caaf4bb366239b0a8b7a5e5a44d043b5f66ae7364895317af8847ac6fadbd2b';
export const TEST_FEE_PUBLIC_KEY = '03c9fc819e3c26ec4a58639add07f6372e810513f5d3d7374c25c65fdf1aefe4c5';
export const TEST_VAULT_UUID = '0xcf5f227dd384a590362b417153876d9d22b31b2ed1e22065e270b82437cf1880';
export const TEST_FEE_RATE = 147n;

// derivation paths for BitGo wallets
export const DERIVATION_PATH_NATIVE_SEGWIT_FROM_MASTER = `m/0/0/20/`;
export const DERIVATION_PATH_NATIVE_SEGWIT_FROM_CHILD = `0/0/20/`;
export const DERIVATION_PATH_TAPROOT_FROM_MASTER = `m/0/0/30/`;
export const DERIVATION_PATH_TAPROOT_FROM_CHILD = `0/0/30/`;

export const TEST_EXTENDED_PRIVATE_KEY_1 =
  'tprv8ZgxMBicQKsPdUfw7LM946yzMWhPrDtmBpB3R5Czx3u98TB2bXgUnkGQbPrNaQ8VQsbjNYseSsggRETuFExqhHoAoqCbrcpVj8pWShR5eQy';
export const TEST_EXTENDED_PUBLIC_KEY_1 =
  'tpubD6NzVbkrYhZ4Wwhizz1jTWe6vYDL1Z5fm7mphbFJNKhXxwRoDvW4yEtGmWJ6n9JE86wpvQsDpzn5t49uenYStgAqwgmKNjDe1D71TdAjy8o';
export const TEST_MASTER_FINGERPRINT_1 = '8400dc04';

export const TEST_EXTENDED_PRIVATE_KEY_2 =
  'tprv8ZgxMBicQKsPfJ6T1H5ErNLa1fZyj2fxCR7vRqVokCLvWg9JypYJoGVdvU6UNkj59o6qDdB97QFk7CQa2XnKZGSzQGhfoc4hCGXrviFuxwP';
export const TEST_EXTENDED_PUBLIC_KEY_2 =
  'tpubD6NzVbkrYhZ4Ym8EtvjqFmzgah5utMrrmiihiMY7AU9KMAQ5cDMtym7W6ccSUinTVbDqK1Vno96HNhaqhS1DuVCrjHoFG9bFa3DKUUMErCv';
export const TEST_MASTER_FINGERPRINT_2 = 'b2cd3e18';

export const TAPROOT_UNSPENDABLE_KEY_STRING = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';

export const TAPROOT_DERIVATION_PATH = "86'";
export const NATIVE_SEGWIT_DERIVATION_PATH = "84'";
