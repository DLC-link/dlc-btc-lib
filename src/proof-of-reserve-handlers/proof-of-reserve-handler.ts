import { Network } from 'bitcoinjs-lib';

import { deriveUnhardenedPublicKey } from '../functions/bitcoin/bitcoin-functions.js';
import { fetchBitcoinBlockchainBlockHeight } from '../functions/bitcoin/bitcoin-request-functions.js';
import { verifyVaultDeposit } from '../functions/proof-of-reserve/proof-of-reserve-functions.js';
import { RawVault } from '../models/ethereum-models.js';

export class ProofOfReserveHandler {
  private bitcoinBlockchainAPI: string;
  private bitcoinNetwork: Network;
  private attestorGroupPublicKey: string;

  constructor(
    bitcoinBlockchainAPI: string,
    bitcoinNetwork: Network,
    attestorGroupPublicKey: string
  ) {
    this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
    this.bitcoinNetwork = bitcoinNetwork;
    this.attestorGroupPublicKey = attestorGroupPublicKey;
  }

  async calculateProofOfReserve(vaults: RawVault[]): Promise<number> {
    const bitcoinBlockchainBlockHeight = await fetchBitcoinBlockchainBlockHeight(
      this.bitcoinBlockchainAPI
    );

    const derivedAttestorGroupPublicKey = deriveUnhardenedPublicKey(
      this.attestorGroupPublicKey,
      this.bitcoinNetwork
    );

    const verifiedDeposits = await Promise.all(
      vaults.map(async vault => {
        return (await verifyVaultDeposit(
          vault,
          derivedAttestorGroupPublicKey,
          bitcoinBlockchainBlockHeight,
          this.bitcoinBlockchainAPI,
          this.bitcoinNetwork
        )) === true
          ? vault.valueLocked.toNumber()
          : 0;
      })
    );
    return verifiedDeposits.reduce((a, b) => a + b, 0);
  }
}
