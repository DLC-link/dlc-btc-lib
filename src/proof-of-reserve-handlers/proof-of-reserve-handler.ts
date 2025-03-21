import { Network } from 'bitcoinjs-lib';
import { isNotNil } from 'ramda';

import { fetchBitcoinBlockchainBlockHeight } from '../functions/bitcoin/bitcoin-request-functions.js';
import { getVaultProofOfReserveData } from '../functions/proof-of-reserve/proof-of-reserve-functions.js';
import { RawVault } from '../models/ethereum-models.js';
import { ProofOfReserveData } from '../models/proof-of-reserve.models.js';

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
   * Gets the Proof of Reserve data for a list of vaults.
   *
   * @param vaults - An array of vault objects containing deposit information
   * @returns A promise that resolves to the Proof of Reserve data for the vaults
   */
  async getProofOfReserveData(vaults: RawVault[]): Promise<ProofOfReserveData> {
    const bitcoinBlockchainBlockHeight = await fetchBitcoinBlockchainBlockHeight(
      this.bitcoinBlockchainAPI
    );

    const proofOfReserveData = (
      await Promise.all(
        vaults.map(vault =>
          getVaultProofOfReserveData(
            vault,
            this.extendedAttestorGroupPublicKey,
            bitcoinBlockchainBlockHeight,
            this.bitcoinBlockchainAPI,
            this.bitcoinNetwork
          )
        )
      )
    ).filter(isNotNil);

    return proofOfReserveData.reduce(
      (acc, curr) => {
        acc.proofOfReserve += curr.amount;
        acc.vaultAddresses.push(curr.address);
        return acc;
      },
      { proofOfReserve: 0, vaultAddresses: [] as string[] }
    );
  }
}
