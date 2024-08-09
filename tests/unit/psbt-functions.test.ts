import { hexToBytes } from '@noble/hashes/utils';
import { p2wpkh } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { regtest } from 'bitcoinjs-lib/src/networks';

import * as bitcoinFunctions from '../../src/functions/bitcoin/bitcoin-functions';
import {
  createTaprootMultisigPayment,
  deriveUnhardenedKeyPairFromRootPrivateKey,
} from '../../src/functions/bitcoin/bitcoin-functions';
import { createFundingTransaction } from '../../src/functions/bitcoin/psbt-functions';
import { TEST_REGTEST_BITCOIN_BLOCKCHAIN_API } from '../mocks/api.test.constants';
import { TEST_REGTEST_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1 } from '../mocks/attestor.test.constants';
import {
  TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_PUBLIC_KEY_1,
  TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_UTXOS_1,
  TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_XPRIV_1,
  TEST_BITCOIN_REGTEST_TAPROOT_PUBLIC_KEY_1,
} from '../mocks/bitcoin-account.test.constants';
import {
  TEST_FEE_DEPOSIT_BASIS_POINTS_1,
  TEST_FEE_RATE_1,
  TEST_FEE_RECIPIENT_PUBLIC_KEY_1,
  TEST_UNHARDENED_DERIVED_UNSPENDABLE_KEY_COMMITED_TO_UUID_1,
} from '../mocks/bitcoin.test.constants';

describe('PSBT Functions', () => {
  let depositPayment: P2Ret;
  let multisigPayment: P2TROut;

  beforeAll(() => {
    multisigPayment = createTaprootMultisigPayment(
      Buffer.from(TEST_UNHARDENED_DERIVED_UNSPENDABLE_KEY_COMMITED_TO_UUID_1, 'hex'),
      Buffer.from(TEST_REGTEST_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
      Buffer.from(TEST_BITCOIN_REGTEST_TAPROOT_PUBLIC_KEY_1, 'hex'),
      regtest
    );

    depositPayment = p2wpkh(
      Buffer.from(TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_PUBLIC_KEY_1, 'hex'),
      regtest
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createFundingTransaction', () => {
    it('should successfully create a valid funding transaction', async () => {
      jest
        .spyOn(bitcoinFunctions, 'getUTXOs')
        .mockImplementationOnce(async () => TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_UTXOS_1);

      const depositTransaction = await createFundingTransaction(
        TEST_REGTEST_BITCOIN_BLOCKCHAIN_API,
        regtest,
        99008600n,
        multisigPayment,
        depositPayment,
        TEST_FEE_RATE_1,
        TEST_FEE_RECIPIENT_PUBLIC_KEY_1,
        TEST_FEE_DEPOSIT_BASIS_POINTS_1
      );

      expect(depositTransaction).toBeDefined();
      expect(depositTransaction.inputsLength).toBe(1);
      expect(depositTransaction.outputsLength).toBe(2);
      expect(depositTransaction.getOutput(0).amount?.toString()).toBe('99008600');
      expect(depositTransaction.getOutput(0).script).toStrictEqual(multisigPayment.script);
      expect(depositTransaction.getOutput(1).amount?.toString()).toBe('990086');
      expect(depositTransaction.getOutput(1).script).toStrictEqual(
        p2wpkh(hexToBytes(TEST_FEE_RECIPIENT_PUBLIC_KEY_1), regtest).script
      );

      expect(() =>
        depositTransaction.sign(
          deriveUnhardenedKeyPairFromRootPrivateKey(
            TEST_BITCOIN_REGTEST_NATIVE_SEGWIT_XPRIV_1,
            regtest,
            'p2wpkh',
            0
          ).privateKey!
        )
      ).not.toThrow();
    });
  });
});
