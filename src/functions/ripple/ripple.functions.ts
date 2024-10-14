import { Decimal } from 'decimal.js';
import { BigNumber } from 'ethers';
import {
  AccountLinesRequest,
  AccountLinesResponse,
  AccountNFToken,
  AccountNFTsRequest,
  CheckCreate,
  Client,
  SubmittableTransaction,
  Transaction,
  TransactionMetadataBase,
  TrustSet,
  TxResponse,
  Wallet,
  convertHexToString,
  convertStringToHex,
} from 'xrpl';

import { TRANSACTION_SUCCESS_CODE } from '../../constants/ripple.constants.js';
import { RippleError } from '../../models/errors.js';
import { RawVault } from '../../models/ethereum-models.js';
import { SignResponse } from '../../models/ripple.model.js';
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

  if (lines.some(line => line.currency === 'DLC' && line.account === issuerAddress)) {
    console.log(`Trust Line already exists for Issuer: ${issuerAddress}`);
    return;
  }

  const trustSetTransactionRequest: TrustSet = {
    TransactionType: 'TrustSet',
    Account: ownerAddress,
    LimitAmount: {
      currency: 'DLC',
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
  issuerAddress: string,
  ownerAddress?: string
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

    const rippleVaults = rippleNFTs.map(nft => hexFieldsToLowercase(decodeURI(nft.URI!)));

    if (ownerAddress) {
      return rippleVaults.filter(vault => vault.creator === ownerAddress);
    } else {
      return rippleVaults;
    }
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

    checkRippleTransactionResult(submitResponse);

    return submitResponse;
  } catch (error) {
    throw new RippleError(`Error signing and submitt Transaction: ${error}`);
  }
}

export async function getLockedBTCBalance(
  rippleClient: Client,
  rippleWallet: Wallet,
  issuerAddress: string
): Promise<number> {
  try {
    await connectRippleClient(rippleClient);

    const rippleVaults = await getAllRippleVaults(
      rippleClient,
      issuerAddress,
      rippleWallet.classicAddress
    );

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
  rippleWallet: Wallet,
  issuerAddress: string
): Promise<number> {
  try {
    await connectRippleClient(rippleClient);

    const accountNonXRPBalancesRequest: AccountLinesRequest = {
      command: 'account_lines',
      account: rippleWallet.classicAddress,
      ledger_index: 'validated',
    };

    const {
      result: { lines },
    }: AccountLinesResponse = await rippleClient.request(accountNonXRPBalancesRequest);

    const dlcBTCBalance = lines.find(
      line => line.currency === 'DLC' && line.account === issuerAddress
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
): Promise<Transaction> {
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
        currency: 'DLC',
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
