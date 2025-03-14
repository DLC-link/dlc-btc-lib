import { Network } from 'bitcoinjs-lib';
import { isNotNil } from 'ramda';

import { fetchBitcoinBlockchainBlockHeight } from '../functions/bitcoin/bitcoin-request-functions.js';
import {
  getVaultAddress,
  getVaultDepositAmount,
} from '../functions/proof-of-reserve/proof-of-reserve-functions.js';
import { RawVault } from '../models/ethereum-models.js';

/**
 * Handles the calculation and verification of Proof of Reserve for a list of vaults.
 */
export class ProofOfReserveHandler {
  private bitcoinBlockchainAPI: string;
  private bitcoinNetwork: Network;
  private extendedAttestorGroupPublicKey: string;

  /**
   * Creates a new ProofOfReserveHandler instance.
   *
   * @param bitcoinBlockchainAPI - The URL of the Bitcoin blockchain API
   * @param bitcoinNetwork - The Bitcoin network to use
   * @param extendedAttestorGroupPublicKey - The extended public key of the attestor group
   */
  constructor(
    bitcoinBlockchainAPI: string,
    bitcoinNetwork: Network,
    extendedAttestorGroupPublicKey: string
  ) {
    this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
    this.bitcoinNetwork = bitcoinNetwork;
    this.extendedAttestorGroupPublicKey = extendedAttestorGroupPublicKey;
  }

  /**
   * Gets all vault addresses from a list of vaults.
   *
   * @param vaults - An array of vault objects containing address information
   * @returns A promise that resolves to an array of vault addresses
   */
  async getAllVaultAddresses(vaults: RawVault[]): Promise<string[]> {
    return Promise.all(
      vaults.map(vault =>
        getVaultAddress(vault, this.extendedAttestorGroupPublicKey, this.bitcoinNetwork)
      )
    ).then(addresses => addresses.filter(isNotNil));
  }

  /**
   * Calculates the total value of deposits for a list of vaults in satoshis.
   *
   * @param vaults - An array of vault objects containing deposit information
   * @returns A promise that resolves to the total value of deposits in the vaults in satoshis
   */
  async calculateProofOfReserve(vaults: RawVault[]): Promise<number> {
    const bitcoinBlockchainBlockHeight = await fetchBitcoinBlockchainBlockHeight(
      this.bitcoinBlockchainAPI
    );

    const depositAmounts = await Promise.all(
      vaults.map(vault =>
        getVaultDepositAmount(
          vault,
          this.extendedAttestorGroupPublicKey,
          bitcoinBlockchainBlockHeight,
          this.bitcoinBlockchainAPI,
          this.bitcoinNetwork
        )
      )
    );

    return depositAmounts.reduce((a, b) => a + b, 0);
  }
}
