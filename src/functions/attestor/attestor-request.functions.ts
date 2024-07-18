import { complement, equals, filter, isEmpty, isNil, join, map, prop } from 'ramda';

import {
  FundingTXAttestorInfo,
  WithdrawDepositTXAttestorInfo,
} from '../../models/attestor.models.js';
import { AttestorError } from '../../models/errors.js';
import { sendRequest } from '../request/request.functions.js';

const processAttestorResponses = async (attestorEndpoints: string[], requestBody: string) => {
  const attestorErrorResponses: string[] = filter(
    complement(isNil),
    await Promise.all(
      map(
        url => sendRequest(url, requestBody).catch(error => prop('message', error)),
        attestorEndpoints
      )
    )
  );

  if (equals(attestorEndpoints.length, attestorErrorResponses.length)) {
    throw new AttestorError(
      `Error sending Transaction to Attestors: ${join('|', attestorErrorResponses)}`
    );
  }
};

export async function submitPSBT<T>(
  attestorRootURLs: string[],
  transactionInfo: T,
  endpointPath: string,
  transformBody: (transactionInfo: T) => object
): Promise<void> {
  if (isEmpty(attestorRootURLs)) {
    throw new AttestorError('No Attestor URLs provided');
  }

  const endpoints: string[] = attestorRootURLs.map(url => `${url}${endpointPath}`);
  const requestBody: string = JSON.stringify(transformBody(transactionInfo));

  await processAttestorResponses(endpoints, requestBody);
}

export async function submitFundingPSBT(
  attestorRootURLs: string[],
  fundingTXAttestorInfo: FundingTXAttestorInfo
): Promise<void> {
  await submitPSBT(attestorRootURLs, fundingTXAttestorInfo, '/app/create-psbt-event', info => ({
    uuid: info.vaultUUID,
    funding_transaction_psbt: info.fundingPSBT,
    mint_address: info.userEthereumAddress,
    chain: info.attestorChainID,
    alice_pubkey: info.userBitcoinTaprootPublicKey,
  }));
}

export async function submitWithdrawDepositPSBT(
  attestorRootURLs: string[],
  withdrawDepositTXAttestorInfo: WithdrawDepositTXAttestorInfo
): Promise<void> {
  await submitPSBT(attestorRootURLs, withdrawDepositTXAttestorInfo, '/app/withdraw', info => ({
    uuid: info.vaultUUID,
    wd_psbt: info.withdrawDepositPSBT,
  }));
}
