import { Decimal } from 'decimal.js';
import { BigNumber } from 'ethers';
import {
  AccountNFToken,
  AccountNFTsRequest,
  CheckCreate,
  Client,
  SubmittableTransaction,
  TransactionMetadataBase,
  TxResponse,
  Wallet,
  convertHexToString,
  convertStringToHex,
} from 'xrpl';

import { TRANSACTION_SUCCESS_CODE } from '../../constants/ripple.constants.js';
import { RippleError } from '../../models/errors.js';
import { RawVault } from '../../models/ethereum-models.js';
import { SignResponse } from '../../models/ripple.model.js';
import { unshiftValue } from '../../utilities/index.js';

function hexFieldsToLowercase(vault: RawVault): RawVault {
  return {
    ...vault,
    creator: vault.creator.toLowerCase(),
    protocolContract: vault.protocolContract.toLowerCase(),
    uuid: vault.uuid.toLowerCase(),
    fundingTxId: vault.fundingTxId.toLowerCase(),
    wdTxId: vault.wdTxId.toLowerCase(),
    btcFeeRecipient: vault.btcFeeRecipient.toLowerCase(),
    taprootPubKey: vault.taprootPubKey.toLowerCase(),
  };
}

export function encodeURI(vault: RawVault): string {
  const version = parseInt('1', 16).toString().padStart(2, '0'); // 1 as hex
  const status = parseInt(vault.status.toString(), 16).toString().padStart(2, '0');
  let uuid = vault.uuid;
  if (uuid === '') {
    uuid = vault.uuid.padStart(64, '0');
  }
  if (uuid.substring(0, 2) === '0x') {
    uuid = uuid.slice(2);
  }
  const valueLockedPadded = vault.valueLocked._hex.substring(2).padStart(16, '0');
  const valueMintedPadded = vault.valueMinted._hex.substring(2).padStart(16, '0');
  const timestamp = vault.timestamp._hex.substring(2).padStart(20, '0');
  const creator = convertStringToHex(vault.creator).padStart(68, '0');
  const fundingTxId = vault.fundingTxId.padStart(64, '0');
  const wdTxId = vault.wdTxId.padStart(64, '0');
  const btcMintFeeBasisPoints = vault.btcMintFeeBasisPoints._hex.substring(2).padStart(8, '0');
  const btcRedeemFeeBasisPoints = vault.btcRedeemFeeBasisPoints._hex.substring(2).padStart(8, '0');
  const btcFeeRecipient = vault.btcFeeRecipient.padStart(66, '0');
  const taprootPubKey = vault.taprootPubKey.padStart(64, '0');

  const nftURI = [
    version,
    status,
    uuid,
    valueLockedPadded,
    valueMintedPadded,
    timestamp,
    creator,
    fundingTxId,
    wdTxId,
    btcMintFeeBasisPoints,
    btcRedeemFeeBasisPoints,
    btcFeeRecipient,
    taprootPubKey,
  ].join('');

  console.log('Encoded URI:', nftURI);

  return nftURI;
}

export function decodeURI(URI: string): RawVault {
  try {
    return {
      status: parseInt(URI.slice(2, 4), 16),
      uuid: `0x${URI.slice(4, 68)}`,
      valueLocked: BigNumber.from(`0x${URI.slice(68, 84)}`),
      valueMinted: BigNumber.from(`0x${URI.slice(84, 100)}`),
      protocolContract: convertHexToString(URI.slice(120, 188)),
      timestamp: BigNumber.from(`0x${URI.slice(100, 120)}`),
      creator: convertHexToString(URI.slice(120, 188)),
      fundingTxId: URI.slice(188, 252) === '0'.repeat(64) ? '' : URI.slice(188, 252),
      wdTxId: URI.slice(252, 316) === '0'.repeat(64) ? '' : URI.slice(252, 316),
      btcMintFeeBasisPoints: BigNumber.from(`0x${URI.slice(316, 324)}`),
      btcRedeemFeeBasisPoints: BigNumber.from(`0x${URI.slice(324, 332)}`),
      btcFeeRecipient: URI.slice(332, 398),
      taprootPubKey: URI.slice(398, 462),
      closingTxId: '', // Deprecated
    };
  } catch (error) {
    throw new Error(`Could not decode NFT URI: ${error}`);
  }
}

export function checkRippleTransactionResult(txResponse: TxResponse<SubmittableTransaction>): void {
  const meta = txResponse.result.meta;

  if (!meta) {
    throw new RippleError('Transaction Metadata not found');
  }

  if (typeof meta === 'string') {
    throw new RippleError(`Could not read Transaction Result of: ${meta}`);
  }

  const transactionResult = (meta as TransactionMetadataBase).TransactionResult;

  if (transactionResult !== TRANSACTION_SUCCESS_CODE) {
    throw new RippleError(`Transaction failed: ${transactionResult}`);
  }
}

export function getRippleClient(serverEndpoint: string): Client {
  return new Client(serverEndpoint);
}

export function getRippleWallet(seedPhrase: string): Wallet {
  return Wallet.fromSeed(seedPhrase);
}

export async function connectRippleClient(rippleClient: Client): Promise<void> {
  if (rippleClient.isConnected()) {
    return;
  }
  await rippleClient.connect();
}

export function formatRippleVaultUUID(vaultUUID: string): string {
  return vaultUUID.startsWith('0x') ? vaultUUID.slice(2).toUpperCase() : vaultUUID.toUpperCase();
}

export function findNFTByUUID(rippleNFTs: AccountNFToken[], vaultUUID: string): AccountNFToken {
  const rippleNFT = rippleNFTs.find(
    rippleNFT => rippleNFT.URI && decodeURI(rippleNFT.URI).uuid.slice(2) === vaultUUID
  );

  if (!rippleNFT) {
    throw new Error(`Could not find NFT with UUID: ${vaultUUID}`);
  }

  return rippleNFT;
}

export async function getRippleVault(
  rippleClient: Client,
  issuerAddress: string,
  vaultUUID: string
): Promise<RawVault> {
  try {
    await connectRippleClient(rippleClient);

    let formattedUUID = vaultUUID.substring(0, 2) === '0x' ? vaultUUID.slice(2) : vaultUUID;
    formattedUUID = formattedUUID.toUpperCase();
    const getAccountNFTsRequest: AccountNFTsRequest = {
      command: 'account_nfts',
      account: issuerAddress,
    };

    const {
      result: { account_nfts: rippleNFTs },
    } = await rippleClient.request(getAccountNFTsRequest);

    const nftID = findNFTByUUID(rippleNFTs, formattedUUID).NFTokenID;

    const matchingNFTs = rippleNFTs.filter(nft => nft.NFTokenID === nftID);

    if (matchingNFTs.length === 0) {
      throw new RippleError(`Vault with UUID: ${formattedUUID} not found`);
    }

    if (matchingNFTs.length > 1) {
      throw new RippleError(`Multiple Vaults found with UUID: ${formattedUUID}`);
    }

    return hexFieldsToLowercase(decodeURI(matchingNFTs[0].URI!));
  } catch (error) {
    throw new RippleError(`Error getting Vault ${vaultUUID}: ${error}`);
  }
}

export async function getAllRippleVaults(
  rippleClient: Client,
  issuerAddress: string
): Promise<RawVault[]> {
  try {
    await connectRippleClient(rippleClient);

    const getAccountNFTsRequest: AccountNFTsRequest = {
      command: 'account_nfts',
      account: issuerAddress,
    };

    const {
      result: { account_nfts: rippleNFTs },
    } = await rippleClient.request(getAccountNFTsRequest);

    return rippleNFTs.map(nft => hexFieldsToLowercase(decodeURI(nft.URI!)));
  } catch (error) {
    throw new RippleError(`Error getting Vaults: ${error}`);
  }
}

export async function createCheck(
  rippleClient: Client,
  rippleWallet: Wallet,
  destinationAddress: string,
  destinationTag: number = 1,
  dlcBTCAmount: string,
  vaultUUID: string
): Promise<string> {
  try {
    await connectRippleClient(rippleClient);

    console.log(`Creating Check for Vault ${vaultUUID} with an amount of ${dlcBTCAmount}`);

    const amountAsNumber = new Decimal(dlcBTCAmount).toNumber();
    const shiftedAmountAsNumber = unshiftValue(amountAsNumber);

    const createCheckRequestJSON: CheckCreate = {
      TransactionType: 'CheckCreate',
      Account: rippleWallet.classicAddress,
      Destination: destinationAddress,
      DestinationTag: destinationTag,
      SendMax: {
        currency: 'DLC',
        value: shiftedAmountAsNumber.toString(),
        issuer: destinationAddress,
      },
      InvoiceID: vaultUUID,
    };

    const updatedCreateCheckRequestJSON: CheckCreate =
      await rippleClient.autofill(createCheckRequestJSON);

    console.log(`Signing Create Check for Vault ${vaultUUID}:`, updatedCreateCheckRequestJSON);

    const signCreateCheckResponse: SignResponse = rippleWallet.sign(updatedCreateCheckRequestJSON);

    const submitCreateCheckResponse: TxResponse<SubmittableTransaction> =
      await rippleClient.submitAndWait(signCreateCheckResponse.tx_blob);

    console.log(
      `Response for submitted Create Check for Vault ${vaultUUID} request:`,
      submitCreateCheckResponse
    );

    checkRippleTransactionResult(submitCreateCheckResponse);

    return submitCreateCheckResponse.result.hash;
  } catch (error) {
    throw new RippleError(`Error creating Check for Vault ${vaultUUID}: ${error}`);
  }
}
