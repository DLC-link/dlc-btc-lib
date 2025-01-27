import { Decimal } from 'decimal.js';
import { BigNumber } from 'ethers';
import {
  AccountLinesRequest,
  AccountLinesResponse,
  AccountLinesTrustline,
  AccountNFToken,
  AccountNFTsRequest,
  AccountObjectsRequest,
  CheckCreate,
  Client,
  LedgerEntry,
  SubmittableTransaction,
  Transaction,
  TransactionMetadata,
  TrustSet,
  TxResponse,
  Wallet,
  convertHexToString,
  convertStringToHex,
  multisign,
} from 'xrpl';

import {
  TRANSACTION_SUCCESS_CODE,
  XRPL_IBTC_CURRENCY_HEX,
} from '../../constants/ripple.constants.js';
import { RippleError } from '../../models/errors.js';
import { RawVault } from '../../models/ethereum-models.js';
import { SignResponse, SignatureType, XRPLSignatures } from '../../models/ripple.model.js';
import { shiftValue, unshiftValue } from '../../utilities/index.js';

function hexFieldsToLowercase(vault: RawVault): RawVault {
  return {
    ...vault,
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
      btcFeeRecipient: (feeRecipient =>
        feeRecipient.startsWith('02') || feeRecipient.startsWith('03')
          ? feeRecipient
          : feeRecipient.replace(/^0+/, ''))(URI.slice(332, 398)),
      taprootPubKey: URI.slice(398, 462),
      closingTxId: '', // Deprecated
      icyIntegrationAddress: '', // not used in xrpl
    };
  } catch (error) {
    throw new Error(`Could not decode NFT URI: ${error}`);
  }
}

/**
 * Validates XRPL transaction response and throws error if invalid
 * @param txResponse - XRPL transaction response
 * @throws RippleError if metadata missing, unreadable, or transaction failed
 */
export function checkXRPLTransactionResult(txResponse: TxResponse<SubmittableTransaction>): void {
  const meta = txResponse.result.meta;

  if (!meta) {
    throw new RippleError('Transaction Metadata not found');
  }

  if (typeof meta === 'string') {
    throw new RippleError(`Could not read Transaction Result of: ${meta}`);
  }

  const transactionResult = (meta as TransactionMetadata).TransactionResult;

  if (transactionResult !== TRANSACTION_SUCCESS_CODE) {
    throw new RippleError(`Transaction failed: ${transactionResult}`);
  }
}

/**
 * Submits a multi-signed transaction to the XRPL network
 * @param xrplClient - Connected XRPL Client instance
 * @param targetXRPLSignatureType - Signature type to process ('mintNFT', 'mintToken', etc)
 * @param xrplSignatures - Array of XRPL signature objects
 * @returns Transaction response from XRPL network
 * @throws Error if signatures not found or transaction fails
 */
export async function submitMultiSignedXRPLTransaction(
  xrplClient: Client,
  targetXRPLSignatureType: SignatureType,
  xrplSignatures: XRPLSignatures[]
): Promise<TxResponse<SubmittableTransaction>> {
  const targetXRPLSignatures = xrplSignatures.find(
    sig => sig.signatureType === targetXRPLSignatureType
  )?.signatures;

  if (!targetXRPLSignatures) throw new Error(`No Signatures found for ${targetXRPLSignatureType}`);

  console.log(`Requesting [${targetXRPLSignatureType}] Transaction`);

  const response = await xrplClient.submitAndWait(multiSignTransaction(targetXRPLSignatures));

  checkXRPLTransactionResult(response);

  console.log(`[${targetXRPLSignatureType}] Transaction was successful`);

  return response;
}

export function getRippleClient(serverEndpoint: string): Client {
  return new Client(serverEndpoint);
}

export function getRippleWallet(seedPhrase: string): Wallet {
  return Wallet.fromSeed(seedPhrase);
}

export async function connectRippleClient(rippleClient: Client): Promise<boolean> {
  if (rippleClient.isConnected()) {
    return false;
  }
  await rippleClient.connect();
  return true;
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

export async function setTrustLine(
  rippleClient: Client,
  ownerAddress: string,
  issuerAddress: string
): Promise<TrustSet | undefined> {
  await connectRippleClient(rippleClient);

  const accountNonXRPBalancesRequest: AccountLinesRequest = {
    command: 'account_lines',
    account: ownerAddress,
    ledger_index: 'validated',
  };

  const {
    result: { lines },
  }: AccountLinesResponse = await rippleClient.request(accountNonXRPBalancesRequest);

  if (
    lines.some(line => line.currency === XRPL_IBTC_CURRENCY_HEX && line.account === issuerAddress)
  ) {
    console.log(`Trust Line already exists for Issuer: ${issuerAddress}`);
    return;
  }

  const trustSetTransactionRequest: TrustSet = {
    TransactionType: 'TrustSet',
    Account: ownerAddress,
    LimitAmount: {
      currency: XRPL_IBTC_CURRENCY_HEX,
      issuer: issuerAddress,
      value: '10000000000',
    },
  };

  const updatedTrustSetTransactionRequest = await rippleClient.autofill(trustSetTransactionRequest);
  return updatedTrustSetTransactionRequest;
}

export async function getRippleVault(
  rippleClient: Client,
  issuerAddress: string,
  vaultUUID: string
): Promise<RawVault> {
  try {
    await connectRippleClient(rippleClient);

    const formattedUUID = vaultUUID.substring(0, 2) === '0x' ? vaultUUID : `0x${vaultUUID}`;

    const allVaults = await getAllXRPLVaults(rippleClient, issuerAddress);

    const vault = allVaults.find(vault => vault.uuid.toLowerCase() === formattedUUID.toLowerCase());

    if (!vault) {
      throw new RippleError(`Vault ${vaultUUID} not found`);
    }

    return vault;
  } catch (error) {
    throw new RippleError(`Error getting Vault ${vaultUUID}: ${error}`);
  }
}

/**
 * Fetches all NFTs from a given issuer address using pagination
 * @param xrplClient - Connected XRPL Client instance
 * @param issuerAddress - Address of the NFT issuer
 * @returns Array of AccountNFToken objects from XRPL network
 * @throws RippleError if operation fails
 */
export async function getAllIssuerNFTs(
  xrplClient: Client,
  issuerAddress: string
): Promise<AccountNFToken[]> {
  try {
    let marker: any = undefined;
    const limit = 100;
    let allNFTs: any[] = [];

    do {
      const getAccountNFTsRequest: AccountNFTsRequest = {
        command: 'account_nfts',
        account: issuerAddress,
        limit,
        marker,
      };

      const {
        result: { account_nfts: rippleNFTs, marker: newMarker },
      } = await xrplClient.request(getAccountNFTsRequest);

      allNFTs = allNFTs.concat(rippleNFTs);

      marker = newMarker;
    } while (marker);

    return allNFTs;
  } catch (error) {
    throw new RippleError(`Error getting NFTs: ${error}`);
  }
}

/**
 * Gets the NFTokenID of the oldest NFT (lowest serial number) for a given Vault UUID
 * @param xrplClient - Connected XRPL Client instance
 * @param issuerAddress - Address of the NFT issuer
 * @param vaultUUID - UUID of the Vault to search for
 * @returns NFTokenID string from XRPL network
 * @throws RippleError if matching Vault not found or operation fails
 */
export async function getSecondToNewestNFTokenIDForVault(
  xrplClient: Client,
  issuerAddress: string,
  vaultUUID: string
): Promise<string> {
  try {
    const allNFTs = await getAllIssuerNFTs(xrplClient, issuerAddress);
    const matchingNFTs = allNFTs.filter(nft => decodeURI(nft.URI!).uuid.slice(2) === vaultUUID);

    if (!matchingNFTs.length) {
      throw new RippleError(`Vault ${vaultUUID} not found`);
    }

    if (matchingNFTs.length < 2) {
      throw new RippleError(`Vault ${vaultUUID} has only one NFT, no older duplicates found`);
    }

    const sortedNFTs = matchingNFTs.sort((a, b) => b.nft_serial - a.nft_serial);
    return sortedNFTs[1].NFTokenID;
  } catch (error) {
    throw new RippleError(`Could not find NFTokenID for Vault: ${error}`);
  }
}

/**
 * Retrieves all Vaults from XRPL network, keeping only latest NFT per Vault UUID
 * @param xrplClient - Connected XRPL Client instance
 * @param issuerAddress - Address of the NFT issuer
 * @param ownerAddress - Optional address to filter Vaults by owner
 * @returns Array of RawVault objects from XRPL network
 * @throws RippleError if operation fails
 */
export async function getAllXRPLVaults(
  xrplClient: Client,
  issuerAddress: string,
  ownerAddress?: string
): Promise<RawVault[]> {
  try {
    const allNFTs = await getAllIssuerNFTs(xrplClient, issuerAddress);

    const allNFTsSortedBySerialID = allNFTs.sort((a, b) => b.nft_serial - a.nft_serial);

    const uniqueUUIDFilteredNFTs = allNFTsSortedBySerialID.reduce<AccountNFToken[]>(
      (unique, nft) => {
        const vaultUUID = decodeURI(nft.URI!).uuid;
        const isDuplicate = unique.some(
          (filtered: AccountNFToken) => decodeURI(filtered.URI!).uuid === vaultUUID
        );
        return isDuplicate ? unique : [...unique, nft];
      },
      []
    );

    const xrplVaults = uniqueUUIDFilteredNFTs.map(nft => hexFieldsToLowercase(decodeURI(nft.URI!)));

    return ownerAddress ? xrplVaults.filter(vault => vault.creator === ownerAddress) : xrplVaults;
  } catch (error) {
    throw new RippleError(`Error getting Vaults: ${error}`);
  }
}

export async function signAndSubmitRippleTransaction(
  rippleClient: Client,
  rippleWallet: Wallet,
  transaction: Transaction
): Promise<TxResponse<SubmittableTransaction>> {
  try {
    const signResponse: SignResponse = rippleWallet.sign(transaction);

    const submitResponse: TxResponse<SubmittableTransaction> = await rippleClient.submitAndWait(
      signResponse.tx_blob
    );

    console.log(`Response for submitted Transaction Request:`, submitResponse);

    checkXRPLTransactionResult(submitResponse);

    return submitResponse;
  } catch (error) {
    throw new RippleError(`Error signing and submitt Transaction: ${error}`);
  }
}

export async function getLockedBTCBalance(
  rippleClient: Client,
  userAddress: string,
  issuerAddress: string
): Promise<number> {
  try {
    await connectRippleClient(rippleClient);

    const rippleVaults = await getAllXRPLVaults(rippleClient, issuerAddress, userAddress);

    const lockedBTCBalance = rippleVaults.reduce((accumulator, vault) => {
      return accumulator + vault.valueLocked.toNumber();
    }, 0);

    return lockedBTCBalance;
  } catch (error) {
    throw new RippleError(`Error getting locked BTC balance: ${error}`);
  }
}

export async function getDLCBTCBalance(
  rippleClient: Client,
  userAddress: string,
  issuerAddress: string
): Promise<number> {
  try {
    await connectRippleClient(rippleClient);

    const accountNonXRPBalancesRequest: AccountLinesRequest = {
      command: 'account_lines',
      account: userAddress,
      ledger_index: 'validated',
    };

    const {
      result: { lines },
    }: AccountLinesResponse = await rippleClient.request(accountNonXRPBalancesRequest);

    const dlcBTCBalance = lines.find(
      line => line.currency === XRPL_IBTC_CURRENCY_HEX && line.account === issuerAddress
    );
    if (!dlcBTCBalance) {
      return 0;
    } else {
      return shiftValue(new Decimal(dlcBTCBalance.balance).toNumber());
    }
  } catch (error) {
    throw new RippleError(`Error getting BTC balance: ${error}`);
  }
}

export async function createCheck(
  rippleClient: Client,
  ownerAddress: string,
  destinationAddress: string,
  destinationTag: number = 1,
  dlcBTCAmount: string,
  vaultUUID: string
): Promise<CheckCreate> {
  try {
    await connectRippleClient(rippleClient);

    console.log(`Creating Check for Vault ${vaultUUID} with an amount of ${dlcBTCAmount}`);

    const amountAsNumber = new Decimal(dlcBTCAmount).toNumber();
    const shiftedAmountAsNumber = unshiftValue(amountAsNumber);

    const createCheckRequestJSON: CheckCreate = {
      TransactionType: 'CheckCreate',
      Account: ownerAddress,
      Destination: destinationAddress,
      DestinationTag: destinationTag,
      SendMax: {
        currency: XRPL_IBTC_CURRENCY_HEX,
        value: shiftedAmountAsNumber.toString(),
        issuer: destinationAddress,
      },
      InvoiceID: vaultUUID,
    };

    const updatedCreateCheckRequestJSON: CheckCreate =
      await rippleClient.autofill(createCheckRequestJSON);

    return updatedCreateCheckRequestJSON;
  } catch (error) {
    throw new RippleError(`Error creating Check for Vault ${vaultUUID}: ${error}`);
  }
}

export async function getCheckByTXHash(
  rippleClient: Client,
  issuerAddress: string,
  txHash: string
): Promise<LedgerEntry.Check> {
  try {
    await connectRippleClient(rippleClient);

    let marker: any = undefined;
    const limit = 100;
    let allChecks: any[] = [];

    do {
      const getAccountObjectsRequest: AccountObjectsRequest = {
        command: 'account_objects',
        account: issuerAddress,
        ledger_index: 'validated',
        marker,
        limit,
        type: 'check',
      };

      const {
        result: { account_objects, marker: newMarker },
      } = await rippleClient.request(getAccountObjectsRequest);

      allChecks = allChecks.concat(account_objects);

      marker = newMarker;
    } while (marker);

    const check = allChecks.find(accountObject => accountObject.PreviousTxnID === txHash);

    if (!check) {
      throw new RippleError(`Check with TX Hash: ${txHash} not found`);
    }

    return check as LedgerEntry.Check;
  } catch (error) {
    throw new RippleError(`Error getting Check by TX Hash: ${error}`);
  }
}

export async function getTotalIssuance(xrplClient: Client, issuerAddress: string): Promise<number> {
  try {
    let marker: any = undefined;
    const limit = 100;
    let allAccountLines: AccountLinesTrustline[] = [];

    do {
      const accountNonXRPBalancesRequest: AccountLinesRequest = {
        command: 'account_lines',
        account: issuerAddress,
        ledger_index: 'validated',
        marker,
        limit,
      };

      const {
        result: { lines, marker: newMarker },
      }: AccountLinesResponse = await xrplClient.request(accountNonXRPBalancesRequest);

      allAccountLines = allAccountLines.concat(lines);

      marker = newMarker;
    } while (marker);

    return allAccountLines
      .filter(line => line.currency === XRPL_IBTC_CURRENCY_HEX)
      .reduce((sum, line) => sum + new Decimal(line.balance).negated().toNumber(), 0);
  } catch (error) {
    throw new RippleError(`Error getting total issuance: ${error}`);
  }
}

export function multiSignTransaction(signedTransactions: string[]): string {
  try {
    return multisign(signedTransactions);
  } catch (error) {
    throw new RippleError(`Error multi-signing Transaction: ${error}`);
  }
}
