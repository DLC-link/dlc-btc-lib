/** @format */

// test values for the integration tests
export const TEST_BITCOIN_AMOUNT = 0.01;
export const TEST_FEE_AMOUNT = 0.01;
export const TEST_ATTESTOR_PUBLIC_KEY = '4caaf4bb366239b0a8b7a5e5a44d043b5f66ae7364895317af8847ac6fadbd2b';
export const TEST_FEE_PUBLIC_KEY = '03c9fc819e3c26ec4a58639add07f6372e810513f5d3d7374c25c65fdf1aefe4c5';
export const TEST_VAULT_UUID = '0xcf5f227dd384a590362b417153876d9d22b31b2ed1e22065e270b82437cf1880';
export const TEST_FEE_RATE = 147n;

// derivation paths for BitGo wallets
export const DERIVATION_PATH_NATIVE_SEGWIT_FROM_MASTER = `m/0/0/20/`;
export const DERIVATION_PATH_NATIVE_SEGWIT_FROM_CHILD = `0/0/20/`;
export const DERIVATION_PATH_TAPROOT_FROM_MASTER = `m/0/0/30/`;
export const DERIVATION_PATH_TAPROOT_FROM_CHILD = `0/0/30/`;
