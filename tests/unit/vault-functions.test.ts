import { BigNumber } from 'ethers';

import {
  createVaultEvent,
  getUpdatedVaults,
  getVaultEvent,
  getVaultEvents,
} from '../../src/functions/vault/vault.functions';
import { RawVault, VaultState } from '../../src/models/ethereum-models';
import { VaultEvent } from '../../src/models/vault-event.models';

describe('Vault Functions', () => {
  const baseVault: RawVault = {
    uuid: '0x400ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc962',
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
    taprootPubKey: '',
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
    it('returns SETUP_COMPLETE event when previous vault is undefined', () => {
      const vault = { ...baseVault };
      const result = getVaultEvent(undefined, vault);

      expect(result).toEqual({
        name: VaultEvent.SETUP_COMPLETE,
        uuid: vault.uuid,
        value: vault.valueLocked.toNumber(),
      });
    });

    it('returns WITHDRAW_COMPLETE event when status changes to FUNDED and minted is less than locked', () => {
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

      const result = getVaultEvent(previousVault, currentVault);

      expect(result).toEqual({
        name: VaultEvent.WITHDRAW_COMPLETE,
        uuid: currentVault.uuid,
        value: 200000,
      });
    });

    it('returns MINT_COMPLETE event when status changes to FUNDED and minted equals locked', () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.PENDING,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.FUNDED,
      };

      const result = getVaultEvent(previousVault, currentVault);

      expect(result).toEqual({
        name: VaultEvent.MINT_COMPLETE,
        uuid: currentVault.uuid,
        value: 1000000,
      });
    });

    it('returns WITHDRAW_PENDING event when status changes to PENDING with unequal values', () => {
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

      const result = getVaultEvent(previousVault, currentVault);

      expect(result).toEqual({
        name: VaultEvent.WITHDRAW_PENDING,
        uuid: currentVault.uuid,
        value: 200000,
      });
    });

    it('returns MINT_PENDING event when status changes to PENDING with equal values', () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.READY,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.PENDING,
      };

      const result = getVaultEvent(previousVault, currentVault);

      expect(result).toEqual({
        name: VaultEvent.MINT_PENDING,
        uuid: currentVault.uuid,
        value: 0,
      });
    });

    it('returns BURN_COMPLETE event when only minted value decreases', () => {
      const previousVault = {
        ...baseVault,
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        valueMinted: BigNumber.from('800000'),
      };

      const result = getVaultEvent(previousVault, currentVault);

      expect(result).toEqual({
        name: VaultEvent.BURN_COMPLETE,
        uuid: currentVault.uuid,
        value: 200000,
      });
    });

    it('throws error when vault state change is invalid', () => {
      const previousVault = { ...baseVault };
      const currentVault = { ...baseVault };

      expect(() => getVaultEvent(previousVault, currentVault)).toThrow(
        'Invalid Vault State Change'
      );
    });
  });
  describe('createVaultEvent', () => {
    it('creates event payload with provided values', () => {
      const eventName = VaultEvent.SETUP_COMPLETE;
      const uuid = '0x400ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc962';
      const value = 1000000;

      const result = createVaultEvent(eventName, uuid, value);

      expect(result).toEqual({
        name: eventName,
        uuid: uuid,
        value: value,
      });
    });

    it('handles zero value', () => {
      const eventName = VaultEvent.MINT_PENDING;
      const uuid = '0x400ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc962';
      const value = 0;

      const result = createVaultEvent(eventName, uuid, value);

      expect(result).toEqual({
        name: eventName,
        uuid: uuid,
        value: value,
      });
    });

    it('handles negative value', () => {
      const eventName = VaultEvent.BURN_COMPLETE;
      const uuid = '0x400ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc962';
      const value = -1000000;

      const result = createVaultEvent(eventName, uuid, value);

      expect(result).toEqual({
        name: eventName,
        uuid: uuid,
        value: value,
      });
    });
  });
  describe('getVaultEvents', () => {
    it('returns SETUP_COMPLETE event for new vault', () => {
      const newVault = { ...baseVault };
      const result = getVaultEvents([newVault], []);

      expect(result).toEqual([
        {
          name: VaultEvent.SETUP_COMPLETE,
          uuid: newVault.uuid,
          value: newVault.valueLocked.toNumber(),
        },
      ]);
    });

    it('returns WITHDRAW_PENDING event when status changes to PENDING with different minted and locked values', () => {
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

      const result = getVaultEvents([currentVault], [previousVault]);

      expect(result).toEqual([
        {
          name: VaultEvent.WITHDRAW_PENDING,
          uuid: currentVault.uuid,
          value: 200000,
        },
      ]);
    });

    it('returns MINT_PENDING event when status changes to PENDING with equal values', () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.READY,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.PENDING,
      };

      const result = getVaultEvents([currentVault], [previousVault]);

      expect(result).toEqual([
        {
          name: VaultEvent.MINT_PENDING,
          uuid: currentVault.uuid,
          value: 0,
        },
      ]);
    });

    it('returns WITHDRAW_COMPLETE event when status changes to FUNDED with decreased locked value', () => {
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

      const result = getVaultEvents([currentVault], [previousVault]);

      expect(result).toEqual([
        {
          name: VaultEvent.WITHDRAW_COMPLETE,
          uuid: currentVault.uuid,
          value: 200000,
        },
      ]);
    });

    it('returns MINT_COMPLETE event when status changes to FUNDED with equal minted and locked values', () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.PENDING,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.FUNDED,
      };

      const result = getVaultEvents([currentVault], [previousVault]);

      expect(result).toEqual([
        {
          name: VaultEvent.MINT_COMPLETE,
          uuid: currentVault.uuid,
          value: 1000000,
        },
      ]);
    });

    it('returns BURN_COMPLETE event when minted value decreases', () => {
      const previousVault = {
        ...baseVault,
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        valueMinted: BigNumber.from('800000'),
      };

      const result = getVaultEvents([currentVault], [previousVault]);

      expect(result).toEqual([
        {
          name: VaultEvent.BURN_COMPLETE,
          uuid: currentVault.uuid,
          value: 200000,
        },
      ]);
    });

    it('handles multiple vault updates correctly', () => {
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

      const result = getVaultEvents(
        [vault1Current, vault2Current],
        [vault1Previous, vault2Previous]
      );

      expect(result).toEqual([
        {
          name: VaultEvent.WITHDRAW_PENDING,
          uuid: '0x1',
          value: 200000,
        },
        {
          name: VaultEvent.BURN_COMPLETE,
          uuid: '0x2',
          value: 200000,
        },
      ]);
    });

    it('returns empty array when no vaults have changed', () => {
      const vault = { ...baseVault };
      const result = getVaultEvents([vault], [vault]);
      expect(result).toEqual([]);
    });
  });
});
