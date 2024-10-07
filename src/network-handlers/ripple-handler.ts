import { Decimal } from 'decimal.js';
import { BigNumber } from 'ethers';
import xrpl, {
  AccountNFTsRequest,
  AccountObject,
  AccountObjectsResponse,
  CheckCash,
  CheckCreate,
  IssuedCurrencyAmount,
  LedgerEntry,
  Payment,
  Request,
  SubmittableTransaction,
  TxResponse,
} from 'xrpl';
import { NFTokenMintMetadata } from 'xrpl/dist/npm/models/transactions/NFTokenMint.js';

import { RippleError } from '../models/errors.js';
import { RawVault, SSFVaultUpdate, SSPVaultUpdate } from '../models/ethereum-models.js';
import { shiftValue, unshiftValue } from '../utilities/index.js';

interface SignResponse {
  tx_blob: string;
  hash: string;
}

function encodeNftURI(vault: RawVault): string {
  const VERSION = parseInt('1', 16).toString().padStart(2, '0'); // 1 as hex
  const status = parseInt(vault.status.toString(), 16).toString().padStart(2, '0');
  // console.log(
  //   `UUID: ${vault.uuid}, valueLocked: ${vault.valueLocked}, valueMinted: ${vault.valueMinted}`
  // );
  let uuid = vault.uuid;
  if (uuid === '') {
    uuid = vault.uuid.padStart(64, '0');
  }
  if (uuid.substring(0, 2) === '0x') {
    uuid = uuid.slice(2);
  }
  // add padding so valueLocked and valueMinted are always 16 characters
  const valueLockedPadded = vault.valueLocked._hex.substring(2).padStart(16, '0');
  const valueMintedPadded = vault.valueMinted._hex.substring(2).padStart(16, '0');
  const fundingTxId = vault.fundingTxId.padStart(64, '0');
  const wdTxId = vault.wdTxId.padStart(64, '0');
  const btcMintFeeBasisPoints = vault.btcMintFeeBasisPoints._hex.substring(2).padStart(2, '0');
  const btcRedeemFeeBasisPoints = vault.btcRedeemFeeBasisPoints._hex.substring(2).padStart(2, '0');
  const btcFeeRecipient = vault.btcFeeRecipient.padStart(66, '0');
  const taprootPubKey = vault.taprootPubKey.padStart(64, '0');
  console.log(
    'built URI:',
    `${VERSION}${status}${uuid}${valueLockedPadded}${valueMintedPadded}${fundingTxId}${wdTxId}${btcMintFeeBasisPoints}${btcRedeemFeeBasisPoints}${btcFeeRecipient}${taprootPubKey}`
  );
  return `${VERSION}${status}${uuid}${valueLockedPadded}${valueMintedPadded}${fundingTxId}${wdTxId}${btcMintFeeBasisPoints}${btcRedeemFeeBasisPoints}${btcFeeRecipient}${taprootPubKey}`;
}

function decodeNftURI(URI: string): RawVault {
  // let VERSION = 0;
  let uuid = '';
  let valueLocked = BigNumber.from(0);
  let valueMinted = BigNumber.from(0);
  let status = 0;
  let fundingTxId = '';
  let wdTxId = '';
  let btcMintFeeBasisPoints = BigNumber.from(0);
  let btcRedeemFeeBasisPoints = BigNumber.from(0);
  let btcFeeRecipient = '';
  let taprootPubKey = '';
  try {
    // VERSION = parseInt(URI.slice(0, 2), 16);
    status = parseInt(URI.slice(2, 4), 16);
    uuid = URI.slice(4, 68);
    valueLocked = BigNumber.from(`0x${URI.slice(68, 84)}`);
    valueMinted = BigNumber.from(`0x${URI.slice(84, 100)}`);
    fundingTxId = URI.slice(100, 164);
    if (fundingTxId === '0'.repeat(64)) {
      fundingTxId = '';
    }
    wdTxId = URI.slice(164, 228);
    if (wdTxId === '0'.repeat(64)) {
      wdTxId = '';
    }
    btcMintFeeBasisPoints = BigNumber.from(`0x${URI.slice(228, 230)}`);
    btcRedeemFeeBasisPoints = BigNumber.from(`0x${URI.slice(230, 232)}`);
    btcFeeRecipient = URI.slice(232, 298);
    taprootPubKey = URI.slice(298, 362);
  } catch (error) {
    console.log(`Error decoding URI: ${error}`);
    console.log(`URI which failed to Decode: ${URI}`);
    return {} as RawVault;
  }
  // console.log(
  //   `Decoded URI: Version: ${VERSION}, status: ${status}, UUID: ${uuid}, valueLocked: ${valueLocked}, valueMinted: ${valueMinted}, fundingTxId: ${fundingTxId}, wdTxId: ${wdTxId}, btcMintFeeBasisPoints: ${btcMintFeeBasisPoints}, btcRedeemFeeBasisPoints: ${btcRedeemFeeBasisPoints}, btcFeeRecipient: ${btcFeeRecipient} , taprootPubKey: ${taprootPubKey}`
  // );
  const baseVault = buildDefaultNftVault();
  return {
    ...baseVault,
    uuid: `0x${uuid}`,
    status: status,
    valueLocked: valueLocked,
    valueMinted: valueMinted,
    creator: 'rfvtbrXSxLsxVWDktR4sdzjJgv8EnMKFKG', //this.customerWallet.classicAddress ?
    fundingTxId: fundingTxId,
    wdTxId: wdTxId,
    btcMintFeeBasisPoints: btcMintFeeBasisPoints,
    btcRedeemFeeBasisPoints: btcRedeemFeeBasisPoints,
    btcFeeRecipient: btcFeeRecipient,
    taprootPubKey: taprootPubKey,
  };
}

function lowercaseHexFields(vault: RawVault): RawVault {
  return {
    ...vault,
    uuid: vault.uuid.toLowerCase(),
    fundingTxId: vault.fundingTxId.toLowerCase(),
    wdTxId: vault.wdTxId.toLowerCase(),
    btcFeeRecipient: vault.btcFeeRecipient.toLowerCase(),
    taprootPubKey: vault.taprootPubKey.toLowerCase(),
  };
}

function buildDefaultNftVault(): RawVault {
  return {
    uuid: `0x${'0'.repeat(64)}`,
    valueLocked: BigNumber.from(0),
    valueMinted: BigNumber.from(0),
    protocolContract: '',
    timestamp: BigNumber.from(0),
    creator: 'rfvtbrXSxLsxVWDktR4sdzjJgv8EnMKFKG',
    status: 0,
    fundingTxId: '0'.repeat(64),
    closingTxId: '',
    wdTxId: '0'.repeat(64),
    btcFeeRecipient: '03c9fc819e3c26ec4a58639add07f6372e810513f5d3d7374c25c65fdf1aefe4c5',
    btcMintFeeBasisPoints: BigNumber.from(100),
    btcRedeemFeeBasisPoints: BigNumber.from(100),
    taprootPubKey: '0'.repeat(64),
  };
}

export class RippleHandler {
  private client: xrpl.Client;
  private customerWallet: xrpl.Wallet;
  private wallet: xrpl.Wallet;
  private issuerWallet: xrpl.Wallet;

  private constructor(seed: string) {
    this.client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    this.wallet = xrpl.Wallet.fromSeed(seed);
    this.issuerWallet = xrpl.Wallet.fromSeed('sEdVJZsxTCVMCvLzUHkXsdDPrvtj8Lo'); // address: ra9epzthPkNXykgfadCwu8D7mtajj8DVCP
    this.customerWallet = xrpl.Wallet.fromSeed('sEdSKUhR1Hhwomo7CsUzAe2pv7nqUXT');
  }

  static fromSeed(seed: string): RippleHandler {
    return new RippleHandler(seed);
  }

  async submit(signatures: string[]): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      const multisig_tx = xrpl.multisign(signatures);

      const tx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(multisig_tx);
      const meta: NFTokenMintMetadata = tx.result.meta! as NFTokenMintMetadata;

      if (meta.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(`Could not burn temporary Ripple Vault: ${meta!.TransactionResult}`);
      }
      return tx.result.hash;
    } catch (error) {
      throw new RippleError(`Could not submit transaction: ${error}`);
    }
  }

  async getNetworkInfo(): Promise<xrpl.ServerInfoResponse> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      return await this.client.request({ command: 'server_info' });
    } catch (error) {
      throw new RippleError(`Could not fetch Network Info: ${error}`);
    }
  }

  async getAddress(): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      return this.customerWallet.classicAddress;
    } catch (error) {
      throw new RippleError(`Could not fetch Address Info: ${error}`);
    }
  }

  async getRawVault(uuid: string): Promise<RawVault> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      const getNFTsTransaction: AccountNFTsRequest = {
        command: 'account_nfts',
        account: this.issuerWallet.classicAddress,
      };
      let nftUUID = uuid.substring(0, 2) === '0x' ? uuid.slice(2) : uuid;
      nftUUID = nftUUID.toUpperCase();
      const nfts: xrpl.AccountNFTsResponse = await this.client.request(getNFTsTransaction);
      const nftTokenId = await this.getNFTokenIdForVault(nftUUID);
      const matchingNFT = nfts.result.account_nfts.filter(nft => nft.NFTokenID === nftTokenId);
      if (matchingNFT.length === 0) {
        throw new RippleError(`Vault with UUID: ${nftUUID} not found`);
      } else if (matchingNFT.length > 1) {
        throw new RippleError(`Multiple Vaults with UUID: ${nftUUID} found`);
      }
      const matchingVault: RawVault = decodeNftURI(matchingNFT[0].URI!);
      return lowercaseHexFields(matchingVault);
    } catch (error) {
      throw new RippleError(`Could not fetch Vault: ${error}`);
    }
  }

  async setupVault(uuid: string): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      const newVault = buildDefaultNftVault();
      newVault.uuid = uuid;
      return await this.mintNFT(newVault);
    } catch (error) {
      throw new RippleError(`Could not setup Ripple Vault: ${error}`);
    }
  }

  async withdraw(uuid: string, withdrawAmount: bigint): Promise<string[]> {
    // Things like withdraw and deposit should get the existing NFT vault
    // then burn the NFT, and mint a new one with the updated value
    // putting the UUID into the URI
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      console.log(`Performing Withdraw for User: ${uuid}`);
      let nftUUID = uuid.substring(0, 2) === '0x' ? uuid.slice(2) : uuid;
      nftUUID = nftUUID.toUpperCase();
      const thisVault = await this.getRawVault(nftUUID);
      const burnSig = await this.burnNFT(nftUUID, 1);

      thisVault.valueMinted = thisVault.valueMinted.sub(BigNumber.from(withdrawAmount));
      const mintSig = await this.mintNFT(thisVault, 2);
      return [burnSig, mintSig];
    } catch (error) {
      throw new RippleError(`Unable to perform Withdraw for User: ${error}`);
    }
  }

  async setVaultStatusFunded(
    burnNFTSignedTxBlobs: string[],
    mintTokensSignedTxBlobs: string[], // this can be a set of empty string is no tokens are being minted
    mintNFTSignedTxBlobs: string[]
  ): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      console.log('Doing the burn for SSF');
      const burn_multisig_tx = xrpl.multisign(burnNFTSignedTxBlobs);
      const burnTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(burn_multisig_tx);
      const burnMeta: NFTokenMintMetadata = burnTx.result.meta! as NFTokenMintMetadata;
      if (burnMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(
          `Could not burn temporary Ripple Vault: ${burnMeta!.TransactionResult}`
        );
      }

      // multisig mint
      if (mintTokensSignedTxBlobs.every(sig => sig !== '')) {
        console.log('Success! Now minting the actual tokens!! How fun $$');

        const mint_token_multisig_tx = xrpl.multisign(mintTokensSignedTxBlobs);
        const mintTokenTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(mint_token_multisig_tx);
        const mintTokenMeta: NFTokenMintMetadata = mintTokenTx.result.meta! as NFTokenMintMetadata;
        if (mintTokenMeta!.TransactionResult !== 'tesSUCCESS') {
          throw new RippleError(
            `Could not mint tokens to user: ${mintTokenMeta!.TransactionResult}`
          );
        }
      } else {
        console.log('No need to mint tokens, because this was a withdraw flow SSF');
      }

      console.log('Success! Now Doing the mint for SSF');
      // multisig mint
      const mint_multisig_tx = xrpl.multisign(mintNFTSignedTxBlobs);
      const mintTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(mint_multisig_tx);
      const mintMeta: NFTokenMintMetadata = mintTx.result.meta! as NFTokenMintMetadata;
      if (mintMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(
          `Could not mint temporary Ripple Vault: ${mintMeta!.TransactionResult}`
        );
      }
    } catch (error) {
      throw new RippleError(`Unable to set Vault status to FUNDED: ${error}`);
    }
  }

  async performCheckCashAndNftUpdate(
    cashCheckSignedTxBlobs: string[],
    burnNFTSignedTxBlobs: string[],
    mintNFTSignedTxBlobs: string[]
  ): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      console.log('Doing the check cashing');
      // multisig burn
      const cash_check_tx = xrpl.multisign(cashCheckSignedTxBlobs);
      const cashCheckTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(cash_check_tx); // add timeouts
      const cashCheckMeta: NFTokenMintMetadata = cashCheckTx.result.meta! as NFTokenMintMetadata;
      if (cashCheckMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(`Could not cash check: ${cashCheckMeta!.TransactionResult}`);
      }

      console.log('Doing the burn for SSP');
      // multisig burn
      const burn_multisig_tx = xrpl.multisign(burnNFTSignedTxBlobs);
      const burnTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(burn_multisig_tx); // add timeouts
      const burnMeta: NFTokenMintMetadata = burnTx.result.meta! as NFTokenMintMetadata;
      if (burnMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(
          `Could not burn temporary Ripple Vault: ${burnMeta!.TransactionResult}`
        );
      }

      console.log('Success! Now Doing the mint for SSP');

      // multisig mint
      const mint_multisig_tx = xrpl.multisign(mintNFTSignedTxBlobs);
      const mintTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(mint_multisig_tx); // add timeouts
      const mintMeta: NFTokenMintMetadata = mintTx.result.meta! as NFTokenMintMetadata;
      if (mintMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(
          `Could not mint temporary Ripple Vault: ${mintMeta!.TransactionResult}`
        );
      }

      console.log('Success! Done with the mint for SSP');
    } catch (error) {
      throw new RippleError(`Unable to set Vault status to PENDING: ${error}`);
    }
  }

  async setVaultStatusPending(
    burnNFTSignedTxBlobs: string[],
    mintNFTSignedTxBlobs: string[]
  ): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      console.log('Doing the burn for SSP');
      // multisig burn
      const burn_multisig_tx = xrpl.multisign(burnNFTSignedTxBlobs);
      const burnTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(burn_multisig_tx);
      const burnMeta: NFTokenMintMetadata = burnTx.result.meta! as NFTokenMintMetadata;
      if (burnMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(
          `Could not burn temporary Ripple Vault: ${burnMeta!.TransactionResult}`
        );
      }

      console.log('Success! Now Doing the mint for SSP');

      // multisig mint
      const mint_multisig_tx = xrpl.multisign(mintNFTSignedTxBlobs);
      const mintTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(mint_multisig_tx);
      const mintMeta: NFTokenMintMetadata = mintTx.result.meta! as NFTokenMintMetadata;
      if (mintMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(
          `Could not mint temporary Ripple Vault: ${mintMeta!.TransactionResult}`
        );
      }

      console.log('Success! Done with the mint for SSP');
    } catch (error) {
      throw new RippleError(`Unable to set Vault status to PENDING: ${error}`);
    }
  }

  async getContractVaults(): Promise<RawVault[]> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      const getNFTsTransaction: AccountNFTsRequest = {
        command: 'account_nfts',
        account: this.issuerWallet.classicAddress,
      };

      const nfts: xrpl.AccountNFTsResponse = await this.client.request(getNFTsTransaction);
      const allNFTs = nfts.result.account_nfts;
      const allVaults: RawVault[] = allNFTs.map(nft => lowercaseHexFields(decodeNftURI(nft.URI!)));

      return allVaults;
    } catch (error) {
      throw new RippleError(`Could not fetch All Vaults: ${error}`);
    }
  }

  async getNFTokenIdForVault(uuid: string): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    console.log(`Getting NFTokenId for vault: ${uuid}`);
    try {
      const getNFTsTransaction: AccountNFTsRequest = {
        command: 'account_nfts',
        account: this.issuerWallet.classicAddress,
      };

      const nfts: xrpl.AccountNFTsResponse = await this.client.request(getNFTsTransaction);
      const matchingNFT = nfts.result.account_nfts.find(
        nft => decodeNftURI(nft.URI!).uuid.slice(2) === uuid
      );

      if (!matchingNFT) {
        throw new RippleError(`Vault for uuid: ${uuid} not found`);
      }
      return matchingNFT.NFTokenID;
    } catch (error) {
      throw new RippleError(`Could not find NFTokenId for vault Vault: ${error}`);
    }
  }

  async burnNFT(nftUUID: string, incrementBy: number = 0): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    console.log(`Getting sig for Burning Ripple Vault, vault: ${nftUUID}`);
    const nftTokenId = await this.getNFTokenIdForVault(nftUUID);
    const burnTransactionJson: SubmittableTransaction = {
      TransactionType: 'NFTokenBurn',
      Account: this.issuerWallet.classicAddress,
      NFTokenID: nftTokenId,
    };
    const preparedBurnTx = await this.client.autofill(burnTransactionJson, 3); // this hardcoded number should match the number of active signers

    // set the LastLedgerSequence to equal LastLedgerSequence plus 5 and then rounded up to the nearest 10
    // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
    preparedBurnTx.LastLedgerSequence =
      Math.ceil(preparedBurnTx.LastLedgerSequence! / 10000 + 1) * 10000; // Better way?!?

    if (incrementBy > 0) {
      preparedBurnTx.Sequence = preparedBurnTx.Sequence! + incrementBy;
    }

    console.log('preparedBurnTx ', preparedBurnTx);

    const sig = this.wallet.sign(preparedBurnTx, true);
    // console.log('tx_one_sig: ', sig);
    return sig.tx_blob;
  }

  async mintNFT(vault: RawVault, incrementBy: number = 0): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    console.log(`Getting sig for Minting Ripple Vault, vault: ${JSON.stringify(vault, null, 2)}`);
    const newURI = encodeNftURI(vault);
    console.log('newURI: ', newURI);
    const mintTransactionJson: SubmittableTransaction = {
      TransactionType: 'NFTokenMint',
      Account: this.issuerWallet.classicAddress,
      URI: newURI,
      NFTokenTaxon: 0,
    };
    const preparedMintTx = await this.client.autofill(mintTransactionJson, 3);

    // set the LastLedgerSequence to equal LastLedgerSequence plus 5 and then rounded up to the nearest 10
    // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
    preparedMintTx.LastLedgerSequence =
      Math.ceil(preparedMintTx.LastLedgerSequence! / 10000 + 1) * 10000;
    if (incrementBy > 0) {
      preparedMintTx.Sequence = preparedMintTx.Sequence! + incrementBy;
    }

    console.log('preparedMintTx ', preparedMintTx);

    const sig = this.wallet.sign(preparedMintTx, true);
    console.log('tx_one_sig: ', sig);
    return sig.tx_blob;
  }

  async getSigUpdateVaultForSSP(uuid: string, updates: SSPVaultUpdate): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      console.log(`Getting sig for getSigUpdateVaultForSSP, vault uuid: ${uuid}`);
      const nftUUID = uuid;
      const thisVault = await this.getRawVault(nftUUID);
      console.log(`the vault, vault: `, thisVault);
      const updatedVault = {
        ...thisVault,
        status: updates.status,
        wdTxId: updates.wdTxId,
        taprootPubKey: updates.taprootPubKey,
      };
      console.log(`the updated vault, vault: `, updatedVault);
      return await this.mintNFT(updatedVault, 1);
    } catch (error) {
      throw new RippleError(`Could not update Vault: ${error}`);
    }
  }

  async getSigUpdateVaultForSSF(
    uuid: string,
    updates: SSFVaultUpdate,
    updateSequenceBy: number
  ): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      const nftUUID = uuid;
      const thisVault = await this.getRawVault(nftUUID);
      const updatedVault = {
        ...thisVault,
        status: updates.status,
        fundingTxId: updates.fundingTxId,
        wdTxId: updates.wdTxId,
        valueMinted: BigNumber.from(updates.valueMinted),
        valueLocked: BigNumber.from(updates.valueLocked),
      };
      return await this.mintNFT(updatedVault, updateSequenceBy);
    } catch (error) {
      throw new RippleError(`Could not update Vault: ${error}`);
    }
  }

  async getAllChecks(): Promise<AccountObject[]> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }

    const getAccountObjectsRequestJSON: Request = {
      command: 'account_objects',
      account: this.issuerWallet.classicAddress,
      ledger_index: 'validated',
      type: 'check',
    };

    const getAccountObjectsResponse: AccountObjectsResponse = await this.client.request(
      getAccountObjectsRequestJSON
    );

    return getAccountObjectsResponse.result.account_objects;
  }

  async getAndCashAllChecksAndUpdateNFT(): Promise<string[]> {
    const allChecks = (await this.getAllChecks()) as LedgerEntry.Check[];
    // console.log('All Checks:', allChecks);
    const allVaults = await this.getContractVaults();

    for (const check of allChecks) {
      try {
        const checkSendMax = check.SendMax as IssuedCurrencyAmount;

        const my_check_cash_sig = await this.cashCheck(check.index, checkSendMax.value);

        const vault = allVaults.find(
          vault => vault.uuid.toUpperCase().slice(2) === check.InvoiceID
        );
        if (!vault) {
          throw new RippleError(
            `Could not find Vault for Check with Invoice ID: ${check.InvoiceID}`
          );
        }
        const two_more_sigs = await this.withdraw(
          vault.uuid,
          BigInt(shiftValue(Number(checkSendMax.value)))
        );
        return [my_check_cash_sig, ...two_more_sigs];
      } catch (error) {
        console.error(`Error cashing Check: ${error} \n continuing`);
      }
    }
    return [];
  }

  async createCheck(dlcBTCAmount: string, vaultUUID: string): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    console.log(`Creating Check for Vault ${vaultUUID} with an amount of ${dlcBTCAmount}`);

    const createCheckTransactionJSON: CheckCreate = {
      TransactionType: 'CheckCreate',
      Account: this.customerWallet.classicAddress,
      Destination: this.issuerWallet.classicAddress,
      DestinationTag: 1,
      SendMax: {
        currency: 'DLC',
        value: unshiftValue(Number(dlcBTCAmount)).toString(),
        issuer: this.issuerWallet.classicAddress,
      },
      InvoiceID: vaultUUID,
    };

    const updatedCreateCheckTransactionJSON: CheckCreate = await this.client.autofill(
      createCheckTransactionJSON
    );

    console.log(
      'Customer is about to sign the following sendCheck tx: ',
      updatedCreateCheckTransactionJSON
    );

    const signCreateCheckTransactionResponse: SignResponse = this.customerWallet.sign(
      updatedCreateCheckTransactionJSON
    );

    const submitCreateCheckTransactionResponse: TxResponse<SubmittableTransaction> =
      await this.client.submitAndWait(signCreateCheckTransactionResponse.tx_blob);

    console.log(
      `Response for submitted Create Check for Vault ${vaultUUID} request: ${JSON.stringify(submitCreateCheckTransactionResponse, null, 2)}`
    );

    return submitCreateCheckTransactionResponse.result.hash;
  }

  async cashCheck(checkID: string, dlcBTCAmount: string): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }

    //what's
    if (
      [
        '8FC923A16C90FB7316673D35CA228C82916B8E9F63EADC57BAA7C51C2E7716AA',
        '93BAA031806AE4902933C1EE9B66E7EBAF0F7A182314085BEFF99DF080A1CBCB',
        'F51C7E3CCFD2EC8CA9A460A34C5BC185E9466031865E76736C0A60BC3F7C7316',
      ].includes(checkID)
    )
      throw new Error('Invalid Check');

    console.log(`Cashing Check of Check ID ${checkID} for an amount of ${dlcBTCAmount}`);

    const cashCheckTransactionJSON: CheckCash = {
      TransactionType: 'CheckCash',
      Account: this.issuerWallet.classicAddress,
      CheckID: checkID,
      Amount: {
        currency: 'DLC',
        value: dlcBTCAmount,
        issuer: this.issuerWallet.classicAddress,
      },
    };

    const updatedCashCheckTransactionJSON: CheckCash = await this.client.autofill(
      cashCheckTransactionJSON,
      3 // hardcoded? not good? just fee related?
    );

    // set the LastLedgerSequence to equal LastLedgerSequence plus 5 and then rounded up to the nearest 10
    // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
    updatedCashCheckTransactionJSON.LastLedgerSequence =
      Math.ceil(updatedCashCheckTransactionJSON.LastLedgerSequence! / 10000 + 1) * 10000;

    console.log(
      'Issuer is about to sign the following cashCheck tx: ',
      updatedCashCheckTransactionJSON
    );

    const signCashCheckTransactionSig: SignResponse = this.wallet.sign(
      updatedCashCheckTransactionJSON,
      true
    );

    return signCashCheckTransactionSig.tx_blob;
  }

  async mintTokens(
    updatedValueMinted: number,
    valueMinted: number,
    incrementBy: number = 0
  ): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }

    if (updatedValueMinted === 0 || valueMinted >= updatedValueMinted) {
      console.log('No need to mint tokens, because this is a withdraw SSF');
      return '';
    }
    const mintValue = unshiftValue(new Decimal(updatedValueMinted).minus(valueMinted).toNumber());
    const dlcBTCAmount = mintValue.toString();
    console.log(`Minting ${dlcBTCAmount} dlcBTC to ${this.customerWallet.classicAddress} address`);

    const sendTokenTransactionJSON: Payment = {
      TransactionType: 'Payment',
      Account: this.issuerWallet.classicAddress,
      Destination: this.customerWallet.classicAddress,
      DestinationTag: 1,
      Amount: {
        currency: 'DLC',
        value: dlcBTCAmount,
        issuer: this.issuerWallet.classicAddress,
      },
    };

    const updatedSendTokenTransactionJSON: Payment = await this.client.autofill(
      sendTokenTransactionJSON,
      3
    );

    // set the LastLedgerSequence to equal LastLedgerSequence plus 5 and then rounded up to the nearest 10
    // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
    updatedSendTokenTransactionJSON.LastLedgerSequence =
      Math.ceil(updatedSendTokenTransactionJSON.LastLedgerSequence! / 10000 + 1) * 10000;

    if (incrementBy > 0) {
      updatedSendTokenTransactionJSON.Sequence =
        updatedSendTokenTransactionJSON.Sequence! + incrementBy;
    }

    console.log(
      'Issuer is about to sign the following mintTokens tx: ',
      updatedSendTokenTransactionJSON
    );

    const signSendTokenTransactionResponse: SignResponse = this.wallet.sign(
      updatedSendTokenTransactionJSON,
      true
    );

    return signSendTokenTransactionResponse.tx_blob;
  }
}
