import { BigNumber } from 'ethers';

import { RawVault, VaultState } from '../../src/models/ethereum-models';
import {
  VaultEvent,
  compareUint8Arrays,
  createRangeFromLength,
  customShiftValue,
  delay,
  getVaultEvents,
  isDefined,
  isNonEmptyString,
  isUndefined,
  reverseBytes,
  shiftValue,
  truncateAddress,
  unshiftValue,
} from '../../src/utilities';

describe('Utility Functions', () => {
  describe('shiftValue', () => {
    it('correctly shifts the value by a power of 10^8', () => {
      const value = 1;
      const shiftedValue = shiftValue(value);
      expect(shiftedValue).toBe(100000000);
    });
  });

  describe('unshiftValue', () => {
    it('correctly unshifts the value by a power of 10^8', () => {
      const value = 100000000;
      const unshiftedValue = unshiftValue(value);
      expect(unshiftedValue).toBe(1);
    });
  });

  describe('customShiftValue', () => {
    it('correctly shifts the value based on the provided parameters', () => {
      const value = 1;
      const shift = 12;
      const shiftedValue = customShiftValue(value, shift, false);
      expect(shiftedValue).toBe(1000000000000);
    });

    it('correctly unshifts the value based on the provided parameters', () => {
      const value = 100000000;
      const shift = 8;
      const unshiftedValue = customShiftValue(value, shift, true);
      expect(unshiftedValue).toBe(1);
    });
  });

  describe('truncateAddress', () => {
    it('correctly truncates the address to the specified format', () => {
      const address = '0x1234567890abcdef';
      const truncatedAddress = truncateAddress(address);
      expect(truncatedAddress).toBe('0x12...cdef');
    });
  });

  describe('createRangeFromLength', () => {
    it('creates a range of numbers based on the provided length', () => {
      const length = 5;
      const range = createRangeFromLength(length);
      expect(range).toStrictEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('isUndefined', () => {
    it('correctly identifies if a value is undefined', () => {
      const value = undefined;
      const isValueUndefined = isUndefined(value);
      expect(isValueUndefined).toBe(true);
    });

    it('correctly identifies if a value is not undefined', () => {
      const value = 1;
      const isValueUndefined = isUndefined(value);
      expect(isValueUndefined).toBe(false);
    });
  });

  describe('isDefined', () => {
    it('correctly identifies if a value is defined', () => {
      const value = 1;
      const isValueDefined = isDefined(value);
      expect(isValueDefined).toBe(true);
    });

    it('correctly identifies if a value is not defined', () => {
      const value = undefined;
      const isValueDefined = isDefined(value);
      expect(isValueDefined).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('correctly identifies if a string is defined and not empty', () => {
      const value = 'Hello, World!';
      const isValueDefinedAndNotEmpty = isNonEmptyString(value);
      expect(isValueDefinedAndNotEmpty).toBe(true);
    });

    it('correctly identifies if a string is not defined', () => {
      const value = undefined;
      const isValueDefinedAndNotEmpty = isNonEmptyString(value);
      expect(isValueDefinedAndNotEmpty).toBe(false);
    });

    it('correctly identifies if a string is defined but empty', () => {
      const value = '';
      const isValueDefinedAndNotEmpty = isNonEmptyString(value);
      expect(isValueDefinedAndNotEmpty).toBe(false);
    });
  });

  describe('compareUint8Arrays', () => {
    it('correctly compares two Uint8Arrays for equality', () => {
      const uint8ArrayA = new Uint8Array([
        0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64, 0x21, 0xff, 0x00, 0x7f,
        0x80, 0xfe, 0x01, 0x76, 0x31, 0x30,
      ]);
      const uint8ArrayB = new Uint8Array([
        0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64, 0x21, 0xff, 0x00, 0x7f,
        0x80, 0xfe, 0x01, 0x76, 0x31, 0x30,
      ]);
      const areArraysEqual = compareUint8Arrays(uint8ArrayA, uint8ArrayB);
      expect(areArraysEqual).toBe(true);
    });

    it('correctly identifies two different Uint8Arrays', () => {
      const uint8ArrayA = new Uint8Array([
        0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64, 0x21, 0xff, 0x00, 0x7f,
        0x80, 0xfe, 0x01, 0x76, 0x31, 0x30,
      ]);
      const uint8ArrayB = new Uint8Array([
        0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64, 0x21, 0xff, 0x00, 0x7f,
        0x80, 0xfe, 0x01, 0x76, 0x31, 0x31,
      ]);

      const areArraysEqual = compareUint8Arrays(uint8ArrayA, uint8ArrayB);
      expect(areArraysEqual).toBe(false);
    });
  });

  describe('reverseBytes', () => {
    it('correctly reverses the bytes of a Uint8Array', () => {
      const uint8Array = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const reversedUint8Array = reverseBytes(uint8Array);
      expect(reversedUint8Array).toStrictEqual(new Uint8Array([0x6f, 0x6c, 0x6c, 0x65, 0x48]));
    });

    it('correctly reverses the bytes of a Buffer', () => {
      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const reversedBuffer = reverseBytes(buffer);
      expect(reversedBuffer).toStrictEqual(Buffer.from([0x6f, 0x6c, 0x6c, 0x65, 0x48]));
    });
  });

  describe('delay', () => {
    it('delays execution for the specified number of milliseconds', () => {
      const delayTime = 10;
      const startTime = Date.now();
      delay(delayTime).then(() => {
        const endTime = Date.now();
        const elapsedTime = endTime - startTime;
        expect(elapsedTime).toBeGreaterThanOrEqual(delayTime);
      });
    });
  });

  describe('getVaultEvents', () => {
    const baseVault: RawVault = {
      uuid: '0x400ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc962',
      protocolContract: '0x6e692DB944162f8b4250aA25eCEe80608457D7a7',
      timestamp: BigNumber.from('0x665da025'),
      valueLocked: BigNumber.from('0x0f4240'),
      valueMinted: BigNumber.from('0x0f4240'),
      creator: '0x0DD4f29E21F10cb2E485cf9bDAb9F2dD1f240Bfa',
      status: VaultState.READY,
      fundingTxId: '',
      closingTxId: '',
      wdTxId: '',
      btcFeeRecipient: '031131cd88bcea8c1d84da8e034bb24c2f6e748c571922dc363e7e088f5df0436c',
      btcMintFeeBasisPoints: BigNumber.from('0x64'),
      btcRedeemFeeBasisPoints: BigNumber.from('0x64'),
      taprootPubKey: '',
      icyIntegrationAddress: '',
    };

    it('should return SETUP_COMPLETE when vault is new', () => {
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

    it('should return WITHDRAW_PENDING when status changes to PENDING and minted and locked values differ', () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.FUNDED,
        valueLocked: BigNumber.from('1200000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.PENDING,
        valueLocked: BigNumber.from('1200000'),
        valueMinted: BigNumber.from('1000000'),
      };

      const result = getVaultEvents([currentVault], [previousVault]);

      expect(result).toEqual([
        {
          name: VaultEvent.WITHDRAW_PENDING,
          uuid: currentVault.uuid,
          value: 200000, // 1200000 - 1000000
        },
      ]);
    });

    it('should return MINT_PENDING when status changes to PENDING and values are equal', () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.READY,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.PENDING,
        valueMinted: BigNumber.from('1000000'),
      };

      const result = getVaultEvents([currentVault], [previousVault]);

      expect(result).toEqual([
        {
          name: VaultEvent.MINT_PENDING,
          uuid: currentVault.uuid,
          value: 0, // No difference in minted value
        },
      ]);
    });

    it('should return WITHDRAW_COMPLETE when status changes to FUNDED and locked value decreases', () => {
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
          value: 200000, // Difference in locked value
        },
      ]);
    });

    it('should return MINT_COMPLETE when status changes to FUNDED and minted equals locked', () => {
      const previousVault = {
        ...baseVault,
        status: VaultState.PENDING,
        valueLocked: BigNumber.from('1000000'),
        valueMinted: BigNumber.from('1000000'),
      };
      const currentVault = {
        ...previousVault,
        status: VaultState.FUNDED,
        valueMinted: BigNumber.from('1000000'),
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

    it('should return BURN_COMPLETE when minted value decreases', () => {
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
          value: 200000, // Difference in minted value
        },
      ]);
    });

    it('should handle multiple vault updates simultaneously', () => {
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

    it('should return empty array when no vaults are updated', () => {
      const vault = { ...baseVault };
      const result = getVaultEvents([vault], [vault]);
      expect(result).toEqual([]);
    });
  });
});
