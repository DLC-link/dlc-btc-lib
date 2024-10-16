import { sendRequest } from '../../src/functions/request/request.functions';
import { TEST_REGTEST_ATTESTOR_APIS } from '../mocks/api.test.constants';

global.fetch = jest.fn();

describe('Request Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('sendRequest', () => {
    it('should not result in an error when the response status is ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockImplementationOnce(async () => new Response(null, { status: 200 }));

      await expect(
        sendRequest(TEST_REGTEST_ATTESTOR_APIS[0], 'requestBody')
      ).resolves.not.toThrow();
    });

    it('should result in an error when the response status is not ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockImplementationOnce(
          async () => new Response(null, { status: 400, statusText: 'Bad Request' })
        );

      await expect(sendRequest(TEST_REGTEST_ATTESTOR_APIS[0], 'requestBody')).rejects.toThrow(
        new Error(`Request to ${TEST_REGTEST_ATTESTOR_APIS[0]} failed: Bad Request - `)
      );
    });

    it('should result in an error when the request fails', async () => {
      jest.spyOn(global, 'fetch').mockImplementationOnce(async () => {
        throw new Error('Failed to fetch');
      });

      await expect(sendRequest(TEST_REGTEST_ATTESTOR_APIS[0], 'requestBody')).rejects.toThrow(
        new Error(`Failed to fetch`)
      );
    });
  });
});
