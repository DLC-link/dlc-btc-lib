import { Client } from 'xrpl';

import {
  decodeURI,
  getAddressBalanceAndReserve,
} from '../../src/functions/ripple/ripple.functions';
import { RippleError } from '../../src/models/errors';
import { TEST_VAULT_4, TEST_VAULT_5 } from '../mocks/ethereum-vault.test.constants';

jest.mock('xrpl', () => {
  const actualXRPL = jest.requireActual('xrpl');
  return {
    ...actualXRPL,
    Client: jest.fn().mockImplementation(() => ({
      request: jest.fn(),
    })),
  };
});

describe('XRPL Functions', () => {
  describe('decodeURI', () => {
    it('should decode a URI when btcFeeRecipient is a BTC address', () => {
      const encodedURI =
        '0100400ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc96200000000000f424000000000000f4240000000000000665da0257266767462725853784C73785657446B74523473647A6A4A677638456E4D4B464B4700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000640000006400000000000000000000000000000002MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc0000000000000000000000000000000000000000000000000000000000000000';

      const decodedURI = decodeURI(encodedURI);

      expect(decodedURI).toEqual(TEST_VAULT_4);
    });

    it('should decode a URI when btcFeeRecipient is a public key', () => {
      const encodedURI =
        '0100400ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc96200000000000f424000000000000f4240000000000000665da0257266767462725853784C73785657446B74523473647A6A4A677638456E4D4B464B47000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006400000064031131cd88bcea8c1d84da8e034bb24c2f6e748c571922dc363e7e088f5df0436c0000000000000000000000000000000000000000000000000000000000000000';

      const decodedURI = decodeURI(encodedURI);

      expect(decodedURI).toEqual(TEST_VAULT_5);
    });
  });
  describe('getAddressReserve', () => {
    let mockClient: jest.Mocked<Client>;

    const testAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';

    beforeEach(() => {
      mockClient = new Client('wss://example.com') as jest.Mocked<Client>;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should calculate reserve and available balance correctly', async () => {
      mockClient.request.mockImplementation((request: any) => {
        if (request.command === 'account_info') {
          return Promise.resolve({
            result: {
              account_data: {
                OwnerCount: 5,
                Balance: '25000000',
              },
            },
          });
        } else if (request.command === 'server_info') {
          return Promise.resolve({
            result: {
              info: {
                validated_ledger: {
                  reserve_base_xrp: 10,
                  reserve_inc_xrp: 2,
                },
              },
            },
          });
        }
        return Promise.reject(new Error('Unexpected request'));
      });

      const result = await getAddressBalanceAndReserve(mockClient, testAddress);

      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(result.ownerCount).toBe(5);
      expect(result.baseReserve).toBe(10);
      expect(result.ownerReserve).toBe(2);
      expect(result.totalReserve).toBe(20);
      expect(result.balance).toBe(25);
      expect(result.availableBalance).toBe(5);
    });

    it('should throw RippleError when validated_ledger is not found', async () => {
      mockClient.request.mockImplementation((request: any) => {
        if (request.command === 'account_info') {
          return Promise.resolve({
            result: {
              account_data: {
                OwnerCount: 5,
                Balance: '25000000',
              },
            },
          });
        } else if (request.command === 'server_info') {
          return Promise.resolve({
            result: {
              info: {
                // No validated_ledger property
              },
            },
          });
        }
        return Promise.reject(new Error('Unexpected request'));
      });

      await expect(getAddressBalanceAndReserve(mockClient, testAddress)).rejects.toThrow(
        new RippleError('Validated Ledger not found')
      );
    });

    it('should handle zero owner count correctly', async () => {
      mockClient.request.mockImplementation((request: any) => {
        if (request.command === 'account_info') {
          return Promise.resolve({
            result: {
              account_data: {
                OwnerCount: 0,
                Balance: '15000000',
              },
            },
          });
        } else if (request.command === 'server_info') {
          return Promise.resolve({
            result: {
              info: {
                validated_ledger: {
                  reserve_base_xrp: 10,
                  reserve_inc_xrp: 2,
                },
              },
            },
          });
        }
        return Promise.reject(new Error('Unexpected request'));
      });

      const result = await getAddressBalanceAndReserve(mockClient, testAddress);

      expect(result.totalReserve).toBe(10);
      expect(result.availableBalance).toBe(5);
    });

    it('should handle very large owner counts correctly', async () => {
      const largeOwnerCount = 1000;
      mockClient.request.mockImplementation((request: any) => {
        if (request.command === 'account_info') {
          return Promise.resolve({
            result: {
              account_data: {
                OwnerCount: largeOwnerCount,
                Balance: '3000000000',
              },
            },
          });
        } else if (request.command === 'server_info') {
          return Promise.resolve({
            result: {
              info: {
                validated_ledger: {
                  reserve_base_xrp: 10,
                  reserve_inc_xrp: 2,
                },
              },
            },
          });
        }
        return Promise.reject(new Error('Unexpected request'));
      });

      const result = await getAddressBalanceAndReserve(mockClient, testAddress);

      expect(result.totalReserve).toBe(2010);
      expect(result.availableBalance).toBe(990);
    });

    it('should return zero available balance when balance exactly meets reserve', async () => {
      mockClient.request.mockImplementation((request: any) => {
        if (request.command === 'account_info') {
          return Promise.resolve({
            result: {
              account_data: {
                OwnerCount: 1,
                Balance: '12000000',
              },
            },
          });
        } else if (request.command === 'server_info') {
          return Promise.resolve({
            result: {
              info: {
                validated_ledger: {
                  reserve_base_xrp: 10,
                  reserve_inc_xrp: 2,
                },
              },
            },
          });
        }
        return Promise.reject(new Error('Unexpected request'));
      });

      const result = await getAddressBalanceAndReserve(mockClient, testAddress);

      expect(result.availableBalance).toBe(0);
    });
  });
});
