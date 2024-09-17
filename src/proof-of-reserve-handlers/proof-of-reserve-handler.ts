import { Network } from 'bitcoinjs-lib';

import { deriveUnhardenedPublicKey } from '../functions/bitcoin/bitcoin-functions.js';
import { fetchBitcoinBlockchainBlockHeight } from '../functions/bitcoin/bitcoin-request-functions.js';
import { BitcoinCoreRpcConnection } from '../functions/bitcoin/bitcoincore-rpc-connection.js';
import { verifyVaultDeposit } from '../functions/proof-of-reserve/proof-of-reserve-functions.js';
import { RawVault } from '../models/ethereum-models.js';

export class ProofOfReserveHandler {
  private bitcoinCoreRpcConnection: BitcoinCoreRpcConnection;
  private bitcoinNetwork: Network;
  private attestorGroupPublicKey: string;

  constructor(
    bitcoinCoreRpcConnection: BitcoinCoreRpcConnection,
    bitcoinNetwork: Network,
    attestorGroupPublicKey: string
  ) {
    this.bitcoinNetwork = bitcoinNetwork;
    this.bitcoinCoreRpcConnection = bitcoinCoreRpcConnection;
    this.attestorGroupPublicKey = attestorGroupPublicKey;
  }

  async calculateProofOfReserve(vaults: RawVault[]): Promise<number> {
    const bitcoinBlockchainBlockHeight = await fetchBitcoinBlockchainBlockHeight(
      this.bitcoinCoreRpcConnection
    );

    const derivedAttestorGroupPublicKey = deriveUnhardenedPublicKey(
      this.attestorGroupPublicKey,
      this.bitcoinNetwork
    );

    const verifiedDeposits = await Promise.all(
      vaults.map(vault =>
        verifyVaultDeposit(
          vault,
          derivedAttestorGroupPublicKey,
          bitcoinBlockchainBlockHeight,
          this.bitcoinCoreRpcConnection,
          this.bitcoinNetwork
        )
      )
    );
    return verifiedDeposits.reduce((a, b) => a + b, 0);
  }
}
