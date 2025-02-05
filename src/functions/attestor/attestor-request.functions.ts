import { equals, filter, isEmpty, isNotNil, join, map, prop } from 'ramda';

import {
  AttestorChainID,
  FundingTXAttestorInfo,
  SharedAttestorConfiguration,
  WithdrawDepositTXAttestorInfo,
} from '../../models/attestor.models.js';
import { AttestorError } from '../../models/errors.js';
import { sendGetRequest, sendRequest } from '../request/request.functions.js';

export async function submitSetupXRPLVaultRequest(
  coordinatorURL: string,
  userXRPLAddress: string,
  attestorChainID: AttestorChainID
): Promise<void> {
  const requestBody = JSON.stringify({
    user_xrpl_address: userXRPLAddress,
    chain: attestorChainID,
  });
  return sendRequest(`${coordinatorURL}/app/setup-xrpl-vault`, requestBody);
}

export async function submitXRPLCheckToCash(
  coordinatorURL: string,
  txHash: string,
  attestorChainID: AttestorChainID
): Promise<void> {
  const requestBody = JSON.stringify({ tx_hash: txHash, chain: attestorChainID });
  return sendRequest(`${coordinatorURL}/app/cash-xrpl-check`, requestBody);
}

export async function getAttestorExtendedGroupPublicKey(coordinatorURL: string): Promise<string> {
  return sendGetRequest(`${coordinatorURL}/app/get-extended-group-publickey`);
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

  await sendAndProcessRequests(endpoints, requestBody);
}

const sendAndProcessRequests = async (attestorEndpoints: string[], requestBody: string) => {
  const attestorErrorResponses: string[] = filter(
    isNotNil,
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

export async function getAttestorConfigurationForChain(
  attestorConfigurationURL: string,
  networkType: 'evm' | 'ripple',
  chainName: string
): Promise<SharedAttestorConfiguration> {
  const chainConfigurationURL = `${attestorConfigurationURL}/${networkType}/${chainName}.json`;

  const getChainConfigurationResponse = await fetch(chainConfigurationURL);

  if (!getChainConfigurationResponse.ok)
    throw new Error(`Could not get chain configuration for ${chainName}`);

  const sharedAttestorConfiguration: SharedAttestorConfiguration =
    await getChainConfigurationResponse.json();

  return sharedAttestorConfiguration;
}
