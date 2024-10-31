import { decode } from 'ripple-binary-codec';

import {
  compareUint8Arrays,
  createRangeFromLength,
  customShiftValue,
  delay,
  isDefined,
  isNonEmptyString,
  isUndefined,
  reverseBytes,
  shiftValue,
  truncateAddress,
  unshiftValue,
} from '../../src/utilities';

describe('Utility Functions', () => {
  describe('template', () => {
    it('should do something', () => {
      console.log(
        decode(
          '12001922000000002400181963201B001DC130202A00000000684000000000000030730075C1260100DBC7CBB16D7BAE3E686A78651470BE7243384AA2F35C0928E4E2CDBF4E3715D200000000000000000000000000000000000000000000672369547266767462725853784C73785657446B74523473647A6A4A677638456E4D4B464B47000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000C0000000C03C9FC819E3C26EC4A58639ADD07F6372E810513F5D3D7374C25C65FDF1AEFE4C500000000000000000000000000000000000000000000000000000000000000008114C9C3EE81E01CB4BE6B7B905872D46BE280759158F3E0107321ED62D2459606EB785F16D3D1C840A143804D7580DF44625E560B1DC9E1800B66F674402FCEC3377F927B3AEBCE1548A89DB11A24206F2520504C08C99E3A0706722283E34828757CFABC640262B0EF06D7A077ADD7E9367DD5BB10462781A3FD4394028114AF233B92B03460E6C2599CC9C773A29D50277EAAE1F1'
        )
      );
      console.log(
        decode(
          '1200192400181963201B001DC130202A00000000684000000000000030730075C1260100DBC7CBB16D7BAE3E686A78651470BE7243384AA2F35C0928E4E2CDBF4E3715D200000000000000000000000000000000000000000000672369547266767462725853784C73785657446B74523473647A6A4A677638456E4D4B464B47000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000C0000000C03C9FC819E3C26EC4A58639ADD07F6372E810513F5D3D7374C25C65FDF1AEFE4C500000000000000000000000000000000000000000000000000000000000000008114C9C3EE81E01CB4BE6B7B905872D46BE280759158F3E0107321ED2C44668E26E34B01FD499DA91FFE04BFEFA51DCC05779EC2B69AC89F0CE3818D7440E4EBEA045B5429871C61576AA81E618918466B4FC77EA0FBD7C39A57BCB942455B71CA0164604A306470B02136AEA1420F415C254C6E0C245131B1ECE2D63A00811437B01400075D2DA23E15EFBEBD323B4C8CB2515BE1F1'
        )
      );
    });
  });
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
});
