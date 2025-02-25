import { testnet } from 'bitcoinjs-lib/src/networks';
import { BigNumber } from 'ethers';

import * as bitcoinRequestFunctions from '../../src/functions/bitcoin/bitcoin-request-functions.js';
import {
  getUpdatedVaults,
  getVaultEvent,
  getVaultEvents,
} from '../../src/functions/vault/vault.functions';
import { RawVault, VaultState } from '../../src/models/ethereum-models';
import { VaultEventName } from '../../src/models/vault-event.models';
import { TEST_TESTNET_BITCOIN_BLOCKCHAIN_API } from '../mocks/api.test.constants';
import { TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1 } from '../mocks/attestor.test.constants';
import { TEST_TESTNET_FUNDING_TRANSACTION_1 } from '../mocks/bitcoin-transaction.test.constants';

describe('Vault Functions', () => {
  const baseVault: RawVault = {
    uuid: '0x2b898d65df757575417a920aabe518586793bac4fa682f00ad2c33fad2471999',
    protocolContract: '',
    timestamp: BigNumber.from('0x665da025'),
    valueLocked: BigNumber.from('1000000'),
    valueMinted: BigNumber.from('1000000'),
    creator: '',
    status: VaultState.READY,
    fundingTxId: '',
    closingTxId: '',
    wdTxId: '',
    btcFeeRecipient: '',
    btcMintFeeBasisPoints: BigNumber.from('15'),
    btcRedeemFeeBasisPoints: BigNumber.from('15'),
    taprootPubKey: 'dc544c17af0887dfc8ca9936755c9fdef0c79bbc8866cd69bf120c71509742d2',
    icyIntegrationAddress: '',
  };
  describe('getUpdatedVaults', () => {
    it('returns empty array when no vaults have changed', () => {
      const vaults = [baseVault];
      const previousVaults = [baseVault];

      expect(getUpdatedVaults(vaults, previousVaults)).toEqual([]);
    });

    it('returns vault when status has changed', () => {
      const updatedVault = {
        ...baseVault,
        status: VaultState.FUNDED,
      };
      const vaults = [updatedVault];
      const previousVaults = [baseVault];

      expect(getUpdatedVaults(vaults, previousVaults)).toEqual([updatedVault]);
    });

    it('returns vault when valueLocked has changed', () => {
      const updatedVault = {
        ...baseVault,
        valueLocked: BigNumber.from('1200000'),
      };
      const vaults = [updatedVault];
      const previousVaults = [baseVault];

      expect(getUpdatedVaults(vaults, previousVaults)).toEqual([updatedVault]);
    });

    it('returns vault when valueMinted has changed', () => {
      const updatedVault = {
        ...baseVault,
        valueMinted: BigNumber.from('1200000'),
      };
      const vaults = [updatedVault];
      const previousVaults = [baseVault];

      expect(getUpdatedVaults(vaults, previousVaults)).toEqual([updatedVault]);
    });

    it('returns only changed vaults from multiple vaults', () => {
      const vault2 = {
        ...baseVault,
        uuid: '0x500ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc962',
      };
      const updatedVault = {
        ...baseVault,
        status: VaultState.FUNDED,
      };
      const vaults = [updatedVault, vault2];
      const previousVaults = [baseVault, vault2];

      expect(getUpdatedVaults(vaults, previousVaults)).toEqual([updatedVault]);
    });

    it('returns new vaults not present in previous state', () => {
      const vault2 = {
        ...baseVault,
        uuid: '0x500ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc962',
      };
      const vaults = [baseVault, vault2];
      const previousVaults = [baseVault];

      expect(getUpdatedVaults(vaults, previousVaults)).toEqual([vault2]);
    });

    it('handles empty previous vaults array', () => {
      const vaults = [baseVault];
      const previousVaults: RawVault[] = [];

      expect(getUpdatedVaults(vaults, previousVaults)).toEqual([baseVault]);
    });

    it('handles empty current vaults array', () => {
      const vaults: RawVault[] = [];
      const previousVaults = [baseVault];

      expect(getUpdatedVaults(vaults, previousVaults)).toEqual([]);
    });
  });
  describe('getVaultEvent', () => {
    it('returns SETUP_COMPLETE event when previous vault is undefined', async () => {
      const vault = { ...baseVault };
      const result = await getVaultEvent(
        undefined,
        vault,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual({
        name: VaultEventName.SETUP_COMPLETE,
        uuid: vault.uuid,
        value: vault.valueLocked.toNumber(),
      });
    });

    it('returns WITHDRAW_COMPLETE event when status changes to FUNDED and minted is less than locked', async () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.PENDING,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('800000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.FUNDED,
        valueLocked: BigNumber.from('800000'),
      };

      const result = await getVaultEvent(
        previousVault,
        currentVault,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual({
        name: VaultEventName.WITHDRAW_COMPLETE,
        uuid: currentVault.uuid,
        value: 200000,
      });
    });

    it('returns MINT_COMPLETE event when status changes to FUNDED and minted equals locked', async () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.PENDING,
        valueLocked: BigNumber.from('500000'),
        valueMinted: BigNumber.from('500000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.FUNDED,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('1000000'),
      };

      const result = await getVaultEvent(
        previousVault,
        currentVault,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual({
        name: VaultEventName.MINT_COMPLETE,
        uuid: currentVault.uuid,
        value: 500000,
      });
    });

    it('returns WITHDRAW_PENDING event when status changes to PENDING with unequal values', async () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.FUNDED,
        valueLocked: BigNumber.from('1200000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.PENDING,
      };

      const result = await getVaultEvent(
        previousVault,
        currentVault,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual({
        name: VaultEventName.WITHDRAW_PENDING,
        uuid: currentVault.uuid,
        value: 200000,
      });
    });

    it('returns MINT_PENDING event when status changes to PENDING with equal values', async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_1);

      const previousVault = {
        ...baseVault,
        status: VaultState.READY,
        valueLocked: BigNumber.from('10000000'),
        valueMinted: BigNumber.from('10000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.PENDING,
        wdTxId: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
      };

      const result = await getVaultEvent(
        previousVault,
        currentVault,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual({
        name: VaultEventName.MINT_PENDING,
        uuid: currentVault.uuid,
        value: 10000000,
      });
    });

    it('returns BURN_COMPLETE event when only minted value decreases', async () => {
      const previousVault = {
        ...baseVault,
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        valueMinted: BigNumber.from('800000'),
      };

      const result = await getVaultEvent(
        previousVault,
        currentVault,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual({
        name: VaultEventName.BURN_COMPLETE,
        uuid: currentVault.uuid,
        value: 200000,
      });
    });

    it('throws error when vault state change is invalid', async () => {
      const previousVault = { ...baseVault };
      const currentVault = { ...baseVault };

      // Use await with expect.rejects instead of wrapping in another async function
      await expect(
        getVaultEvent(
          previousVault,
          currentVault,
          TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
          TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
          testnet
        )
      ).rejects.toThrow(/Unable to determine vault event/);
    });
  });

  describe('getVaultEvents', () => {
    it('returns SETUP_COMPLETE event for new vault', async () => {
      const newVault = { ...baseVault };
      const result = await getVaultEvents(
        [newVault],
        [],
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual([
        {
          name: VaultEventName.SETUP_COMPLETE,
          uuid: newVault.uuid,
          value: newVault.valueLocked.toNumber(),
        },
      ]);
    });

    it('returns WITHDRAW_PENDING event when status changes to PENDING with different minted and locked values', async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_1);

      const previousVault = {
        ...baseVault,
        status: VaultState.FUNDED,
        valueLocked: BigNumber.from('1200000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.PENDING,
      };

      const result = await getVaultEvents(
        [currentVault],
        [previousVault],
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual([
        {
          name: VaultEventName.WITHDRAW_PENDING,
          uuid: currentVault.uuid,
          value: 200000,
        },
      ]);
    });

    it('returns MINT_PENDING event when status changes to PENDING with equal values', async () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.READY,
        valueLocked: BigNumber.from('10000000'),
        valueMinted: BigNumber.from('10000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.PENDING,
        wdTxId: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
      };

      const result = await getVaultEvents(
        [currentVault],
        [previousVault],
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual([
        {
          name: VaultEventName.MINT_PENDING,
          uuid: currentVault.uuid,
          value: 10000000,
        },
      ]);
    });

    it('returns WITHDRAW_COMPLETE event when status changes to FUNDED with decreased locked value', async () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.PENDING,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('800000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.FUNDED,
        valueLocked: BigNumber.from('800000'),
      };

      const result = await getVaultEvents(
        [currentVault],
        [previousVault],
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual([
        {
          name: VaultEventName.WITHDRAW_COMPLETE,
          uuid: currentVault.uuid,
          value: 200000,
        },
      ]);
    });

    it('returns MINT_COMPLETE event when status changes to FUNDED with equal minted and locked values', async () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.PENDING,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.FUNDED,
        valueLocked: BigNumber.from('2000000'),
        valueMinted: BigNumber.from('2000000'),
      };

      const result = await getVaultEvents(
        [currentVault],
        [previousVault],
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual([
        {
          name: VaultEventName.MINT_COMPLETE,
          uuid: currentVault.uuid,
          value: 1000000,
        },
      ]);
    });

    it('returns BURN_COMPLETE event when minted value decreases', async () => {
      const previousVault = {
        ...baseVault,
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        valueMinted: BigNumber.from('800000'),
      };

      const result = await getVaultEvents(
        [currentVault],
        [previousVault],
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual([
        {
          name: VaultEventName.BURN_COMPLETE,
          uuid: currentVault.uuid,
          value: 200000,
        },
      ]);
    });

    it('handles multiple vault updates correctly', async () => {
      const vault1Previous = {
        ...baseVault,
        uuid: '0x1',
        status: VaultState.READY,
        valueLocked: BigNumber.from('1200000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const vault1Current = {
        ...vault1Previous,
        status: VaultState.PENDING,
        valueLocked: BigNumber.from('800000'),
      };

      const vault2Previous = {
        ...baseVault,
        uuid: '0x2',
        valueMinted: BigNumber.from('1000000'),
      };
      const vault2Current = {
        ...vault2Previous,
        valueMinted: BigNumber.from('800000'),
      };

      const result = await getVaultEvents(
        [vault1Current, vault2Current],
        [vault1Previous, vault2Previous],
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toEqual([
        {
          name: VaultEventName.WITHDRAW_PENDING,
          uuid: '0x1',
          value: 200000,
        },
        {
          name: VaultEventName.BURN_COMPLETE,
          uuid: '0x2',
          value: 200000,
        },
      ]);
    });

    it('returns empty array when no vaults have changed', async () => {
      const vault = { ...baseVault };
      const result = await getVaultEvents(
        [vault],
        [vault],
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );
      expect(result).toEqual([]);
    });
  });
});
