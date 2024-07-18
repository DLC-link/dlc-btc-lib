import {
  submitFundingPSBT,
  submitWithdrawDepositPSBT,
} from '../../src/functions/attestor/attestor-request.functions';
import * as requestFunctions from '../../src/functions/request/request.functions';
import {
  FundingTXAttestorInfo,
  WithdrawDepositTXAttestorInfo,
} from '../../src/models/attestor.models';
import { AttestorError } from '../../src/models/errors';
import { TEST_REGTEST_ATTESTOR_APIS } from '../mocks/api.test.constants';

describe('Attestor Request Sending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('submitFundingPSBT', () => {
    const fundingTXAttestorInfo: FundingTXAttestorInfo = {
      vaultUUID: 'vault-uuid',
      fundingPSBT: 'funding-psbt',
      userEthereumAddress: 'user-ethereum-address',
      userBitcoinTaprootPublicKey: 'user-bitcoin-taproot-public-key',
      attestorChainID: 'evm-arbitrum',
    };
    it('should succeed without errors when all requests are successful', async () => {
      jest
        .spyOn(requestFunctions, 'sendRequest')
        .mockImplementationOnce(async () => {})
        .mockImplementationOnce(async () => {})
        .mockImplementationOnce(async () => {});

      await expect(
        submitFundingPSBT(TEST_REGTEST_ATTESTOR_APIS, fundingTXAttestorInfo)
      ).resolves.not.toThrow();
    });

    it('should not throw an error if not all requests are successful', async () => {
      jest
        .spyOn(requestFunctions, 'sendRequest')
        .mockImplementationOnce(async () => {
          throw new Error(`Response ${TEST_REGTEST_ATTESTOR_APIS[0]} was not OK`);
        })
        .mockImplementationOnce(async () => {})
        .mockImplementationOnce(async () => {});

      await expect(
        submitFundingPSBT(TEST_REGTEST_ATTESTOR_APIS, fundingTXAttestorInfo)
      ).resolves.not.toThrow();
    });

    it('should throw an error if all requests fail', async () => {
      jest
        .spyOn(requestFunctions, 'sendRequest')
        .mockImplementationOnce(async () => {
          throw new Error(`Response ${TEST_REGTEST_ATTESTOR_APIS[0]} was not OK`);
        })
        .mockImplementationOnce(async () => {
          throw new Error(`Response ${TEST_REGTEST_ATTESTOR_APIS[1]} was not OK`);
        })
        .mockImplementationOnce(async () => {
          throw new Error(`Response ${TEST_REGTEST_ATTESTOR_APIS[2]} was not OK`);
        });

      await expect(
        submitFundingPSBT(TEST_REGTEST_ATTESTOR_APIS, fundingTXAttestorInfo)
      ).rejects.toThrow(
        new AttestorError(
          `Error sending Transaction to Attestors: Response ${TEST_REGTEST_ATTESTOR_APIS[0]} was not OK|Response ${TEST_REGTEST_ATTESTOR_APIS[1]} was not OK|Response ${TEST_REGTEST_ATTESTOR_APIS[2]} was not OK`
        )
      );
    });

    it('should raise an error when the attestorURLs parameter is empty', async () => {
      await expect(submitFundingPSBT([], fundingTXAttestorInfo)).rejects.toThrow(
        new AttestorError('No Attestor URLs provided')
      );
    });
  });
  describe('submitWithdrawDepositPSBT', () => {
    const withdrawDepositTXAttestorInfo: WithdrawDepositTXAttestorInfo = {
      vaultUUID: 'vault-uuid',
      withdrawDepositPSBT: 'deposit-withdraw-psbt',
    };

    it('should succeed without errors when all requests are successful', async () => {
      jest
        .spyOn(requestFunctions, 'sendRequest')
        .mockImplementationOnce(async () => {})
        .mockImplementationOnce(async () => {})
        .mockImplementationOnce(async () => {});

      await expect(
        submitWithdrawDepositPSBT(TEST_REGTEST_ATTESTOR_APIS, withdrawDepositTXAttestorInfo)
      ).resolves.not.toThrow();
    });

    it('should not throw an error if not all requests are successful', async () => {
      jest
        .spyOn(requestFunctions, 'sendRequest')
        .mockImplementationOnce(async () => {
          throw new Error(`Response ${TEST_REGTEST_ATTESTOR_APIS[0]} was not OK`);
        })
        .mockImplementationOnce(async () => {})
        .mockImplementationOnce(async () => {});

      await expect(
        submitWithdrawDepositPSBT(TEST_REGTEST_ATTESTOR_APIS, withdrawDepositTXAttestorInfo)
      ).resolves.not.toThrow();
    });

    it('should throw an error if all requests fail', async () => {
      jest
        .spyOn(requestFunctions, 'sendRequest')
        .mockImplementationOnce(async () => {
          throw new Error(`Response ${TEST_REGTEST_ATTESTOR_APIS[0]} was not OK`);
        })
        .mockImplementationOnce(async () => {
          throw new Error(`Response ${TEST_REGTEST_ATTESTOR_APIS[1]} was not OK`);
        })
        .mockImplementationOnce(async () => {
          throw new Error(`Response ${TEST_REGTEST_ATTESTOR_APIS[2]} was not OK`);
        });

      await expect(
        submitWithdrawDepositPSBT(TEST_REGTEST_ATTESTOR_APIS, withdrawDepositTXAttestorInfo)
      ).rejects.toThrow(
        new AttestorError(
          `Error sending Transaction to Attestors: Response ${TEST_REGTEST_ATTESTOR_APIS[0]} was not OK|Response ${TEST_REGTEST_ATTESTOR_APIS[1]} was not OK|Response ${TEST_REGTEST_ATTESTOR_APIS[2]} was not OK`
        )
      );
    });

    it('should raise an error when the attestorURLs parameter is empty', async () => {
      await expect(submitWithdrawDepositPSBT([], withdrawDepositTXAttestorInfo)).rejects.toThrow(
        new AttestorError('No Attestor URLs provided')
      );
    });
  });
});
