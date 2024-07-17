import * as attestorRequestFunctions from '../../src/functions/attestor/attestor-request.functions.js';
import { submitFundingPSBT } from '../../src/functions/attestor/attestor-request.functions.js';

describe('Attestor ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('submitFundingPSBT', () => {
    it('should not throw an error if all requests were succesful', async () => {
      jest
        .spyOn(attestorRequestFunctions, 'sendRequest')
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => true);

      await expect(
        submitFundingPSBT(
          ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5000'],
          {
            vaultUUID: 'vaultUUID',
            fundingPSBT: 'fundingPSBT',
            userEthereumAddress: 'userEthereumAddress',
            attestorChainID: 'evm-arbitrum',
            userBitcoinTaprootPublicKey: 'userBitcoinTaprootPublicKey',
          }
        )
      ).resolves.not.toThrow();
    });

    it('should not throw an error if not all requests were succesful', async () => {
      jest
        .spyOn(attestorRequestFunctions, 'sendRequest')
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => false);

      await expect(
        submitFundingPSBT(
          ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5000'],
          {
            vaultUUID: 'vaultUUID',
            fundingPSBT: 'fundingPSBT',
            userEthereumAddress: 'userEthereumAddress',
            attestorChainID: 'evm-arbitrum',
            userBitcoinTaprootPublicKey: 'userBitcoinTaprootPublicKey',
          }
        )
      ).resolves.not.toThrow();
    });
  });
});
