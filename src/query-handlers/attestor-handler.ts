/** @format */
import { AttestorError } from '../models/errors.js';

export class AttestorHandler {
  private attestorRootURLs: string[];
  private ethereumChainID: string;

  constructor(
    attestorRootURLs: string[],
    ethereumChainID: 'evm-arbitrum' | 'evm-arbsepolia' | 'evm-localhost'
  ) {
    this.attestorRootURLs = attestorRootURLs;
    this.ethereumChainID = ethereumChainID;
  }

  async createPSBTEvent(
    vaultUUID: string,
    fundingTransaction: string,
    closingPSBT: string,
    userNativeSegwitAddress: string
  ): Promise<void> {
    const createPSBTEndpoints = this.attestorRootURLs.map(url => `${url}/app/create-psbt-event`);

    const body = JSON.stringify({
      uuid: vaultUUID,
      funding_transaction: fundingTransaction,
      closing_psbt: closingPSBT,
      mint_address: userNativeSegwitAddress,
      chain: this.ethereumChainID,
    });

    const requests = createPSBTEndpoints.map(async url =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body,
      })
        .then(response => (response.ok ? true : response.statusText))
        .catch(error => error.message)
    );

    const responses = await Promise.all(requests);

    const failedResponses = responses.filter(response => response !== true);

    if (failedResponses.length === createPSBTEndpoints.length) {
      throw new AttestorError(
        `Error sending Funding and Closing Transaction to Attestors: ${failedResponses.join(', ')}`
      );
    }
  }
}
