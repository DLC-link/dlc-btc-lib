/** @format */

import { AttestorError } from '../models/errors.js';

export async function getExtendedAttestorGroupPublicKey(attestorURL: string): Promise<string> {
  const attestorExtendedPublicKeyEndpoint = `${attestorURL}/tss/get-extended-group-publickey`;
  const response = await fetch(attestorExtendedPublicKeyEndpoint);

  if (!response.ok) {
    throw new Error(`Failed to get Extended Attestor Group Public Key: ${response.statusText}`);
  }

  const extendedAttestorGroupPublicKey = await response.text();

  return extendedAttestorGroupPublicKey;
}

export async function createPSBTEvent(
  attestorURLs: string[],
  vaultUUID: string,
  fundingTransaction: string,
  closingPSBT: string,
  userNativeSegwitAddress: string
): Promise<void> {
  const ethereumChainID = getAttestorEthereumChainID();
  const createPSBTEndpoints = attestorURLs.map((url) => `${url}/app/create-psbt-event`);

  const requests = createPSBTEndpoints.map(async (url) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        uuid: vaultUUID,
        funding_transaction: fundingTransaction,
        closing_psbt: closingPSBT,
        mint_address: userNativeSegwitAddress,
        chain: ethereumChainID,
      }),
    })
      .then((response) => (response.ok ? true : response.statusText))
      .catch((error) => error.message)
  );

  const responses = await Promise.all(requests);

  const failedResponses = responses.filter((response) => response !== true);

  if (failedResponses.length === createPSBTEndpoints.length) {
    throw new AttestorError(`Error sending Closing Transaction to Attestors: ${failedResponses.join(', ')}`);
  }
}

export function getAttestorURLs(): string[] {
  const attestorsString: string | undefined = process.env.ATTESTOR_URLS;
  if (!attestorsString) {
    throw new Error(`Could not get Attestor URLs: Attestor URLs not set`);
  }

  return attestorsString.split(',');
}

export function getAttestorEthereumChainID(): string {
  const ethereumNetworkName: string | undefined = process.env.ETHEREUM_NETWORK;

  if (!ethereumNetworkName) {
    throw new Error(`Could not get Ethereum Chain ID: Ethereum Network Name not set`);
  }

  switch (ethereumNetworkName) {
    case 'Arbitrum':
      return 'evm-arbitrum';
    case 'Arbitrum Sepolia':
      return 'evm-arbsepolia';
    default:
      throw new Error(`Could not get Ethereum Chain ID: Invalid Ethereum Network Name`);
  }
}
