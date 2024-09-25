import { BigNumber } from 'ethers';
import xrpl, { AccountNFTsRequest, SubmittableTransaction } from 'xrpl';
import { NFTokenMintMetadata } from 'xrpl/dist/npm/models/transactions/NFTokenMint.js';

import { RippleError } from '../models/errors.js';
import { RawVault, VaultState } from '../models/ethereum-models.js';

function encodeNftURI(vault: RawVault): string {
  const VERSION = parseInt('1', 16).toString().padStart(2, '0'); // 1 as hex
  const status = parseInt(vault.status.toString(), 16).toString().padStart(2, '0');
  console.log(
    `UUID: ${vault.uuid}, valueLocked: ${vault.valueLocked}, valueMinted: ${vault.valueMinted}`
  );
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
  const btcFeeRecipient = vault.btcFeeRecipient.padStart(64, '0');
  const taprootPubKey = vault.taprootPubKey.padStart(64, '0');
  console.log(
    'built URI:',
    `${VERSION}${status}${uuid}${valueLockedPadded}${valueMintedPadded}${fundingTxId}${wdTxId}${btcMintFeeBasisPoints}${btcRedeemFeeBasisPoints}${btcFeeRecipient}${taprootPubKey}`
  );
  return `${VERSION}${status}${uuid}${valueLockedPadded}${valueMintedPadded}${fundingTxId}${wdTxId}${btcMintFeeBasisPoints}${btcRedeemFeeBasisPoints}${btcFeeRecipient}${taprootPubKey}`;
}

function decodeNftURI(URI: string): RawVault {
  let VERSION = 0;
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
    VERSION = parseInt(URI.slice(0, 2), 16);
    status = parseInt(URI.slice(2, 4), 16);
    console.log(`Decoding URI: ${URI}`);
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
  console.log(
    `Decoded URI: Version: ${VERSION}, status: ${status}, UUID: ${uuid}, valueLocked: ${valueLocked}, valueMinted: ${valueMinted}, fundingTxId: ${fundingTxId}, wdTxId: ${wdTxId}, btcMintFeeBasisPoints: ${btcMintFeeBasisPoints}, btcRedeemFeeBasisPoints: ${btcRedeemFeeBasisPoints}, btcFeeRecipient: ${btcFeeRecipient} , taprootPubKey: ${taprootPubKey}`
  );
  const baseVault = buildDefaultNftVault();
  return {
    ...baseVault,
    uuid: `0x${uuid}`,
    status: status,
    valueLocked: valueLocked,
    valueMinted: valueMinted,
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
    creator: '',
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
  private demo_wallet: xrpl.Wallet;

  private constructor() {
    this.client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    this.demo_wallet = xrpl.Wallet.fromSeed('sEdV6wSeVoUGwu7KHyFZ3UkrQxpvGZU'); //rNT2CxBbKtiUwy4UFwXS11PETZVW8j4k3g
  }

  static fromWhatever(): RippleHandler {
    return new RippleHandler();
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
      return this.demo_wallet.classicAddress;
    } catch (error) {
      throw new RippleError(`Could not fetch Address Info: ${error}`);
    }
  }

  //   static fromPrivateKey(
  //     ethereumDeploymentPlans: EthereumDeploymentPlan[],
  //     ethereumPrivateKey: string,
  //     rpcEndpoint: string
  //   ): EthereumHandler {
  //     const provider = getProvider(rpcEndpoint);
  //     const signer = new Wallet(ethereumPrivateKey, provider);
  //     const ethereumContracts = getEthereumContracts(ethereumDeploymentPlans, signer);
  //     return new EthereumHandler(ethereumContracts);
  //   }

  //   static fromSigner(
  //     ethereumDeploymentPlans: EthereumDeploymentPlan[],
  //     signer: providers.JsonRpcSigner
  //   ): EthereumHandler {
  //     const ethereumContracts = getEthereumContracts(ethereumDeploymentPlans, signer);
  //     return new EthereumHandler(ethereumContracts);
  //   }

  //   getContracts(): DLCEthereumContracts {
  //     return this.ethereumContracts;
  //   }

  //   async getAllUserVaults(): Promise<RawVault[]> {
  //     try {
  //       const userAddress = await this.ethereumContracts.dlcManagerContract.signer.getAddress();
  //       return await getAllAddressVaults(this.ethereumContracts.dlcManagerContract, userAddress);
  //     } catch (error) {
  //       throw new EthereumHandlerError(`Could not fetch all User Vaults: ${error}`);
  //     }
  //   }

  async getRawVault(uuid: string): Promise<RawVault> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      const getNFTsTransaction: AccountNFTsRequest = {
        command: 'account_nfts',
        account: this.demo_wallet.classicAddress,
      };
      let nftUUID = uuid.substring(0, 2) === '0x' ? uuid.slice(2) : uuid;
      nftUUID = nftUUID.toUpperCase();
      const nfts: xrpl.AccountNFTsResponse = await this.client.request(getNFTsTransaction);
      const nftTokenId = await this.getNFTokenIdForVault(nftUUID);
      const matchingNFT = nfts.result.account_nfts.find(nft => nft.NFTokenID === nftTokenId);
      if (!matchingNFT) {
        throw new RippleError(`Vault with UUID: ${nftUUID} not found`);
      }
      const matchingVault: RawVault = decodeNftURI(matchingNFT.URI!);
      return lowercaseHexFields(matchingVault);
    } catch (error) {
      throw new RippleError(`Could not fetch Vault: ${error}`);
    }
  }

  async setupVault(): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      const newVault = buildDefaultNftVault();
      const newVaultUUID = await this.mintNFT(newVault);

      await this.burnNFT(newVaultUUID);

      newVault.uuid = newVaultUUID;
      await this.mintNFT(newVault);

      return `0x${newVaultUUID}`;
    } catch (error) {
      throw new RippleError(`Could not setup Ripple Vault: ${error}`);
    }
  }

  async withdraw(uuid: string, withdrawAmount: bigint) {
    // Things like withdraw and deposit should get the existing NFT vault
    // then burn the NFT, and mint a new one with the updated value
    // putting the UUID into the URI
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      let nftUUID = uuid.substring(0, 2) === '0x' ? uuid.slice(2) : uuid;
      nftUUID = nftUUID.toUpperCase();
      // return await withdraw(this.ethereumContracts.dlcManagerContract, vaultUUID, withdrawAmount);
      const thisVault = await this.getRawVault(nftUUID);
      await this.burnNFT(nftUUID);
      thisVault.valueMinted = thisVault.valueMinted.sub(BigNumber.from(withdrawAmount));
      await this.mintNFT(thisVault);
    } catch (error) {
      throw new RippleError(`Unable to perform Withdraw for User: ${error}`);
    }
  }

  async setVaultStatusFunded(
    uuid: string,
    bitcoinTransactionID: string,
    updatedValueMinted: bigint
  ): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      let nftUUID = uuid.substring(0, 2) === '0x' ? uuid.slice(2) : uuid;
      nftUUID = nftUUID.toUpperCase();

      console.log(`Setting Vault status to FUNDED, vault: ${nftUUID}`);
      const thisVault = await this.getRawVault(nftUUID);
      await this.burnNFT(nftUUID);
      const newVault = {
        ...thisVault,
        status: VaultState.FUNDED,
        fundingTxId: bitcoinTransactionID,
        wdTxId: '',
        valueMinted: BigNumber.from(updatedValueMinted),
        valueLocked: BigNumber.from(updatedValueMinted),
      };
      await this.mintNFT(newVault);
      console.log(`Vault status set to FUNDED, vault: ${nftUUID}`);
    } catch (error) {
      throw new RippleError(`Unable to set Vault status to FUNDED: ${error}`);
    }
  }

  async setVaultStatusPending(
    uuid: string,
    bitcoinTransactionID: string,
    updatedValueMinted: bigint,
    userPubkey: string
  ): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      let nftUUID = uuid.substring(0, 2) === '0x' ? uuid.slice(2) : uuid;
      nftUUID = nftUUID.toUpperCase();

      console.log(`Setting Vault status to Pending, vault: ${nftUUID}`);
      const thisVault = await this.getRawVault(nftUUID);
      await this.burnNFT(nftUUID);
      const newVault = {
        ...thisVault,
        status: VaultState.PENDING,
        wdTxId: bitcoinTransactionID,
        taprootPubKey: userPubkey,
      };
      await this.mintNFT(newVault);
      console.log(`Vault status set to Pending, vault: ${nftUUID}`);
    } catch (error) {
      throw new RippleError(`Unable to set Vault status to FUNDED: ${error}`);
    }
  }

  //   async getUserDLCBTCBalance(): Promise<number | undefined> {
  //     try {
  //       const userAddress = await this.ethereumContracts.dlcManagerContract.signer.getAddress();
  //       return await getAddressDLCBTCBalance(this.ethereumContracts.dlcBTCContract, userAddress);
  //     } catch (error) {
  //       throw new EthereumHandlerError(`Could not fetch User's dlcBTC balance: ${error}`);
  //     }
  //   }

  //   async getDLCBTCTotalSupply(): Promise<number> {
  //     try {
  //       return await getDLCBTCTotalSupply(this.ethereumContracts.dlcBTCContract);
  //     } catch (error) {
  //       throw new EthereumHandlerError(`Could not fetch Total Supply of dlcBTC: ${error}`);
  //     }
  //   }

  //   async getLockedBTCBalance(userVaults?: RawVault[]): Promise<number> {
  //     try {
  //       if (!userVaults) {
  //         userVaults = await this.getAllUserVaults();
  //       }
  //       return await getLockedBTCBalance(userVaults);
  //     } catch (error) {
  //       throw new EthereumHandlerError(`Could not fetch Total Supply of Locked dlcBTC: ${error}`);
  //     }
  //   }

  //   async getAttestorGroupPublicKey(): Promise<string> {
  //     try {
  //       return getAttestorGroupPublicKey(this.ethereumContracts.dlcManagerContract);
  //     } catch (error) {
  //       throw new EthereumHandlerError(`Could not fetch Attestor Public Key: ${error}`);
  //     }
  //   }

  //   async isWhiteLisingEnabled(): Promise<boolean> {
  //     try {
  //       return await isWhitelistingEnabled(this.ethereumContracts.dlcManagerContract);
  //     } catch (error) {
  //       throw new EthereumHandlerError(`Could not fetch Whitelisting Status: ${error}`);
  //     }
  //   }

  //   async isUserWhitelisted(): Promise<boolean> {
  //     try {
  //       const userAddress = await this.ethereumContracts.dlcManagerContract.signer.getAddress();
  //       return await isUserWhitelisted(this.ethereumContracts.dlcManagerContract, userAddress);
  //     } catch (error) {
  //       throw new EthereumHandlerError(`Could not fetch User Whitelisting Status: ${error}`);
  //     }
  //   }

  async getContractVaults(): Promise<RawVault[]> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    try {
      const getNFTsTransaction: AccountNFTsRequest = {
        command: 'account_nfts',
        account: this.demo_wallet.classicAddress,
      };

      const nfts: xrpl.AccountNFTsResponse = await this.client.request(getNFTsTransaction);
      const allNFTs = nfts.result.account_nfts;
      const allVaults: RawVault[] = allNFTs.map(nft => lowercaseHexFields(decodeNftURI(nft.URI!)));

      // allVaults.forEach((vault, index) => {
      //   if (vault.uuid === '') {
      //     vault.uuid = allNFTs[index].NFTokenID;
      //   }
      // });

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
        account: this.demo_wallet.classicAddress,
      };

      const nfts: xrpl.AccountNFTsResponse = await this.client.request(getNFTsTransaction);
      let matchingNFT = nfts.result.account_nfts.find(
        nft => decodeNftURI(nft.URI!).uuid.slice(2) === uuid
      );
      if (!matchingNFT) {
        console.log('Could not find matching NFT by URI, trying by NFTokenID');
        // when first creating a vault, the tokenID is the UUID
        matchingNFT = nfts.result.account_nfts.find(nft => nft.NFTokenID === uuid);
        if (matchingNFT) {
          console.log('Found matching NFT by NFTokenID');
        }
      } else {
        console.log('Found matching NFT by URI');
      }
      if (!matchingNFT) {
        throw new RippleError(`Vault for uuid: ${uuid} not found`);
      }
      return matchingNFT.NFTokenID;
    } catch (error) {
      throw new RippleError(`Could not find NFTokenId for vault Vault: ${error}`);
    }
  }

  async burnNFT(nftUUID: string): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    console.log(`Burning Ripple Vault, vault: ${nftUUID}`);
    const nftTokenId = await this.getNFTokenIdForVault(nftUUID);
    const burnTransactionJson: SubmittableTransaction = {
      TransactionType: 'NFTokenBurn',
      Account: this.demo_wallet.classicAddress,
      NFTokenID: nftTokenId,
    };
    const burnTx: xrpl.TxResponse<xrpl.SubmittableTransaction> = await this.client.submitAndWait(
      burnTransactionJson,
      { wallet: this.demo_wallet }
    );
    const burnMeta: NFTokenMintMetadata = burnTx.result.meta! as NFTokenMintMetadata;
    if (burnMeta!.TransactionResult !== 'tesSUCCESS') {
      throw new RippleError(
        `Could not burn temporary Ripple Vault: ${burnMeta!.TransactionResult}`
      );
    }
  }

  async mintNFT(vault: RawVault): Promise<string> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    console.log(`Minting Ripple Vault, vault: ${JSON.stringify(vault, null, 2)}`);
    const newURI = encodeNftURI(vault);
    const mintTransactionJson: SubmittableTransaction = {
      TransactionType: 'NFTokenMint',
      Account: this.demo_wallet.classicAddress,
      URI: newURI,
      NFTokenTaxon: 0,
    };
    const mintTx: xrpl.TxResponse<xrpl.SubmittableTransaction> = await this.client.submitAndWait(
      mintTransactionJson,
      { wallet: this.demo_wallet }
    );
    const meta: NFTokenMintMetadata = mintTx.result.meta! as NFTokenMintMetadata;
    if (meta!.TransactionResult !== 'tesSUCCESS') {
      throw new RippleError(`Could not mint Ripple Vault: ${meta!.TransactionResult}`);
    }
    return meta!.nftoken_id!;
  }
}
