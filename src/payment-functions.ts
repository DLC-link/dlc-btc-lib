/** @format */

import { p2ms, p2tr, p2tr_ns, p2wpkh, p2wsh } from '@scure/btc-signer';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { Network } from 'bitcoinjs-lib';
import {
  DERIVATION_PATH_NATIVE_SEGWIT_FROM_CHILD,
  DERIVATION_PATH_NATIVE_SEGWIT_FROM_MASTER,
  DERIVATION_PATH_TAPROOT_FROM_CHILD,
  DERIVATION_PATH_TAPROOT_FROM_MASTER,
} from './constants.js';
import { BitGoAddress } from './models.js';

const bip32 = BIP32Factory(ecc);

export function derivePublicKeyFromExtendedPublicKey(
  extendedPublicKey: string,
  derivationPathRoot: string,
  index: string
) {
  const root = bip32.fromBase58(extendedPublicKey);
  const child = root.derivePath(`${derivationPathRoot}${index}`);
  return child.publicKey.toString('hex');
}

export function getNativeSegwitAddress(publicKey: string, bitcoinNetwork: Network) {
  const publicKeyBuffer = Buffer.from(publicKey, 'hex');
  return p2wpkh(publicKeyBuffer, bitcoinNetwork).address;
}

export function getTaprootAddress(publicKey: string, bitcoinNetwork: Network) {
  const publicKeyBuffer = Buffer.from(publicKey, 'hex');
  return p2tr(publicKeyBuffer, undefined, bitcoinNetwork).address;
}

export function getNativeSegwitMultisigScript(publicKeys: string[], bitcoinNetwork: Network) {
  const redeemScript = p2ms(
    2,
    publicKeys.map((hex) => Buffer.from(hex, 'hex'))
  );
  return p2wsh(redeemScript, bitcoinNetwork);
}

export function getTaprootMultisigScript(publicKeys: string[], bitcoinNetwork: Network) {
  const publicKeysBuffer = publicKeys.map((hex) => {
    return Buffer.from(hex, 'hex').subarray(1);
  });
  const multisig = p2tr_ns(2, publicKeysBuffer);
  return p2tr(undefined, multisig, bitcoinNetwork);
}

export function getNativeSegwitPublicKeys(
  bitGoNativeSegwitAddress: BitGoAddress,
  userXPUB: string,
  backupXPUB: string,
  bitGoXPUB: string,
  bitcoinNetwork: Network
): string[] {
  const userDerivedNativeSegwitPublicKey = derivePublicKeyFromExtendedPublicKey(
    userXPUB,
    DERIVATION_PATH_NATIVE_SEGWIT_FROM_MASTER,
    bitGoNativeSegwitAddress.index.toString()
  );

  const bitGoDerivedNativeSegwitPublicKey = derivePublicKeyFromExtendedPublicKey(
    bitGoXPUB,
    DERIVATION_PATH_NATIVE_SEGWIT_FROM_MASTER,
    bitGoNativeSegwitAddress.index.toString()
  );

  const backupDerivedNativeSegwitPublicKey = derivePublicKeyFromExtendedPublicKey(
    backupXPUB,
    DERIVATION_PATH_NATIVE_SEGWIT_FROM_CHILD,
    bitGoNativeSegwitAddress.index.toString()
  );

  const nativeSegwitPublicKeys = [
    userDerivedNativeSegwitPublicKey,
    backupDerivedNativeSegwitPublicKey,
    bitGoDerivedNativeSegwitPublicKey,
  ];

  const multisigAddress = getNativeSegwitMultisigScript(nativeSegwitPublicKeys, bitcoinNetwork).address;

  if (multisigAddress !== bitGoNativeSegwitAddress.address) {
    throw new Error('Multisig Address does not match the target address.');
  }

  return nativeSegwitPublicKeys;
}

export function getTaprootPublicKeys(
  bitGoTaprootAddress: BitGoAddress,
  userXPUB: string,
  backupXPUB: string,
  bitGoXPUB: string
): string[] {
  const userDerivedTaprootPublicKey = derivePublicKeyFromExtendedPublicKey(
    userXPUB,
    DERIVATION_PATH_TAPROOT_FROM_MASTER,
    bitGoTaprootAddress.index.toString()
  );

  const bitGoDerivedTaprootPublicKey = derivePublicKeyFromExtendedPublicKey(
    bitGoXPUB,
    DERIVATION_PATH_TAPROOT_FROM_MASTER,
    bitGoTaprootAddress.index.toString()
  );

  const backupDerivedTaprootPublicKey = derivePublicKeyFromExtendedPublicKey(
    backupXPUB,
    DERIVATION_PATH_TAPROOT_FROM_CHILD,
    bitGoTaprootAddress.index.toString()
  );

  const taprootPublicKeys = [userDerivedTaprootPublicKey, bitGoDerivedTaprootPublicKey, backupDerivedTaprootPublicKey];

  return taprootPublicKeys;
}
