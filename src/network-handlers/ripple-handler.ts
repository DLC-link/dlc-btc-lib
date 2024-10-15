import { Decimal } from 'decimal.js';
import { BigNumber } from 'ethers';
import xrpl, {
  AccountNFTsRequest,
  AccountObject,
  AccountObjectsResponse,
  CheckCash,
  IssuedCurrencyAmount,
  LedgerEntry,
  Payment,
  Request,
  SubmittableTransaction,
} from 'xrpl';
import { NFTokenMintMetadata } from 'xrpl/dist/npm/models/transactions/NFTokenMint.js';

import { decodeURI, encodeURI } from '../functions/ripple/ripple.functions.js';
import { RippleError } from '../models/errors.js';
import { RawVault, SSFVaultUpdate, SSPVaultUpdate } from '../models/ethereum-models.js';
import { shiftValue, unshiftValue } from '../utilities/index.js';

interface SignResponse {
  tx_blob: string;
  hash: string;
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
  private wallet: xrpl.Wallet;
  private issuerAddress: string;

  private constructor(seedPhrase: string, issuerAddress: string) {
    this.client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    this.wallet = xrpl.Wallet.fromSeed(seedPhrase);
    this.issuerAddress = issuerAddress;
  }

  static fromSeed(seedPhrase: string, issuerAddress: string): RippleHandler {
    return new RippleHandler(seedPhrase, issuerAddress);
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
      return this.wallet.classicAddress;
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
        account: this.issuerAddress,
      };
      let nftUUID = uuid.substring(0, 2) === '0x' ? uuid.slice(2) : uuid;
      nftUUID = nftUUID.toUpperCase();
      const nfts: xrpl.AccountNFTsResponse = await this.client.request(getNFTsTransaction);

      const matchingNFT = nfts.result.account_nfts.filter(
        nft => decodeURI(nft.URI!).uuid.slice(2) === uuid
      );

      if (matchingNFT.length === 0) {
        throw new RippleError(`Vault with UUID: ${nftUUID} not found`);
      } else if (matchingNFT.length > 1) {
        // we have multiple NFTs with the same UUID, this is not a problem
        // let's just return the one with the highest nft_serial
        matchingNFT.sort((a, b) => b.nft_serial - a.nft_serial);
      }
      const matchingVault: RawVault = decodeURI(matchingNFT[0].URI!);
      return lowercaseHexFields(matchingVault);
    } catch (error) {
      throw new RippleError(`Could not fetch Vault: ${error}`);
    }
  }

  async setupVault(uuid: string, userAddress: string): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      const newVault = buildDefaultNftVault();
      newVault.uuid = uuid;
      newVault.creator = userAddress;
      return await this.mintNFT(newVault);
    } catch (error) {
      throw new RippleError(`Could not setup Ripple Vault: ${error}`);
    }
  }

  async withdraw(uuid: string, withdrawAmount: bigint): Promise<string> {
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

      thisVault.valueMinted = thisVault.valueMinted.sub(BigNumber.from(withdrawAmount));
      const mintSig = await this.mintNFT(thisVault);
      return mintSig;
    } catch (error) {
      throw new RippleError(`Unable to perform Withdraw for User: ${error}`);
    }
  }

  async setVaultStatusFunded(
    mintTokensSignedTxBlobs: string[], // this can be a set of empty string is no tokens are being minted
    mintNFTSignedTxBlobs: string[]
  ): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
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
    mintNFTSignedTxBlobs: string[]
  ): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      console.log('Doing the check cashing');
      // multisig cash check
      const cash_check_tx = xrpl.multisign(cashCheckSignedTxBlobs);
      const cashCheckTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(cash_check_tx); // add timeouts
      const cashCheckMeta: NFTokenMintMetadata = cashCheckTx.result.meta! as NFTokenMintMetadata;
      if (cashCheckMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(`Could not cash check: ${cashCheckMeta!.TransactionResult}`);
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

  async setVaultStatusPending(mintNFTSignedTxBlobs: string[]): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
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
        account: this.issuerAddress,
      };

      // Fetch all NFTs from the issuer address
      const nfts: xrpl.AccountNFTsResponse = await this.client.request(getNFTsTransaction);
      const allNFTs = nfts.result.account_nfts;

      // Process NFTs to create a map of Vaults associated with their nft_serials
      const vaultsWithSerials = allNFTs.map(nft => {
        const vault = lowercaseHexFields(decodeURI(nft.URI!)) as RawVault;
        return {
          vault,
          nft_serial: nft.nft_serial, // Keep the serial number from the NFT
        };
      });

      // Group vaults by UUID
      const vaultsByUUID: { [key: string]: { vault: RawVault; nft_serial: number }[] } = {};

      vaultsWithSerials.forEach(({ vault, nft_serial }) => {
        const uuid = vault.uuid.startsWith('0x')
          ? vault.uuid.slice(2).toUpperCase()
          : vault.uuid.toUpperCase();
        if (!vaultsByUUID[uuid]) {
          vaultsByUUID[uuid] = [];
        }
        vaultsByUUID[uuid].push({ vault, nft_serial });
      });

      // Filter and sort vaults based on UUID and their nft_serial
      const uniqueVaults: RawVault[] = Object.values(vaultsByUUID).map(vaultGroup => {
        if (vaultGroup.length > 1) {
          // Sort by serial number if multiple NFTs with the same UUID
          vaultGroup.sort((a, b) => b.nft_serial - a.nft_serial);
        }
        return vaultGroup[0].vault; // Return the vault with the highest nft_serial
      });

      return uniqueVaults;
    } catch (error) {
      throw new RippleError(`Could not fetch All Vaults: ${error}`);
    }
  }

  async mintNFT(vault: RawVault, incrementBy: number = 1): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    console.log(`Getting sig for Minting Ripple Vault, vault: ${JSON.stringify(vault, null, 2)}`);
    const newURI = encodeURI(vault);
    console.log('newURI: ', newURI);
    const mintTransactionJson: SubmittableTransaction = {
      TransactionType: 'NFTokenMint',
      Account: this.issuerAddress,
      URI: newURI,
      NFTokenTaxon: 0,
    };
    const preparedMintTx = await this.client.autofill(mintTransactionJson, 3);

    // set the LastLedgerSequence to equal LastLedgerSequence plus 5 and then rounded up to the nearest 10
    // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
    preparedMintTx.LastLedgerSequence =
      Math.ceil(preparedMintTx.LastLedgerSequence! / 10000 + 1) * 10000;

    preparedMintTx.Sequence = preparedMintTx.Sequence! + incrementBy;

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
      account: this.issuerAddress,
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
        const mint_sig = await this.withdraw(
          vault.uuid,
          BigInt(shiftValue(Number(checkSendMax.value)))
        );
        return [my_check_cash_sig, mint_sig];
      } catch (error) {
        console.error(`Error cashing Check: ${error} \n continuing`);
      }
    }
    return [];
  }

  async cashCheck(checkID: string, dlcBTCAmount: string): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }

    // remove this??
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
      Account: this.issuerAddress,
      CheckID: checkID,
      Amount: {
        currency: 'DLC',
        value: dlcBTCAmount,
        issuer: this.issuerAddress,
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
    destinationAddress: string,
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
    console.log(`Minting ${dlcBTCAmount} dlcBTC to ${destinationAddress} address`);

    const sendTokenTransactionJSON: Payment = {
      TransactionType: 'Payment',
      Account: this.issuerAddress,
      Destination: destinationAddress,
      DestinationTag: 1,
      Amount: {
        currency: 'DLC',
        value: dlcBTCAmount,
        issuer: this.issuerAddress,
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
