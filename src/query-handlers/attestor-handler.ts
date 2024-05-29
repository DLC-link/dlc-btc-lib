/** @format */

import { ethereumArbitrum, ethereumArbitrumSepolia } from '../constants/ethereum-constants.js';
import { AttestorError } from '../models/errors.js';
import { EthereumNetwork } from '../models/ethereum-models.js';

export class AttestorHandler {
  private attestorRootURLs: string[];
  private ethereumChainID: string;

  constructor(attestorRootURLs: string[], ethereumNetwork: EthereumNetwork) {
    this.attestorRootURLs = attestorRootURLs;

    switch (ethereumNetwork) {
      case ethereumArbitrum:
        this.ethereumChainID = 'evm-arbitrum';
        break;
      case ethereumArbitrumSepolia:
        this.ethereumChainID = 'evm-arbsepolia';
        break;
      default:
        throw new Error(`Could not get Ethereum Chain ID: Ethereum Network not supported`);
    }
  }

  async createPSBTEvent(
    vaultUUID: string,
    fundingTransaction: string,
    closingPSBT: string,
    userNativeSegwitAddress: string
  ): Promise<void> {
    const createPSBTEndpoints = this.attestorRootURLs.map((url) => `${url}/app/create-psbt-event`);

    const requests = createPSBTEndpoints.map(async (url) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          uuid: vaultUUID,
          funding_transaction: fundingTransaction,
          closing_psbt: closingPSBT,
          mint_address: userNativeSegwitAddress,
          chain: this.ethereumChainID,
        }),
      })
        .then((response) => (response.ok ? true : response.statusText))
        .catch((error) => error.message)
    );

    const responses = await Promise.all(requests);

    const failedResponses = responses.filter((response) => response !== true);

    if (failedResponses.length === createPSBTEndpoints.length) {
      throw new AttestorError(
        `Error sending Funding and Closing Transaction to Attestors: ${failedResponses.join(', ')}`
      );
    }
  }
}
