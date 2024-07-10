import {
  compareUint8Arrays,
  createRangeFromLength,
  customShiftValue,
  delay,
  isDefined,
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
      const shift = 8;
      const shiftedValue = customShiftValue(value, shift, false);
      expect(shiftedValue).toBe(100000000);
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
      const delayTime = 1000;
      const startTime = Date.now();
      delay(delayTime).then(() => {
        const endTime = Date.now();
        const elapsedTime = endTime - startTime;
        expect(elapsedTime).toBeGreaterThanOrEqual(delayTime);
      });
    });
  });
});
