import { Client } from 'xrpl';

import {
  decodeURI,
  getPaymentAndCheckCashEvents,
} from '../../src/functions/ripple/ripple.functions';
import { TEST_VAULT_4, TEST_VAULT_5 } from '../mocks/ethereum-vault.test.constants';

describe('XRPL Functions', () => {
  describe('decodeURI', () => {
    it('should decode a URI when btcFeeRecipient is a BTC address', async () => {
      const xrplClient = new Client('ws://54.242.85.177:6005');
      await xrplClient.connect();

      const result = await getPaymentAndCheckCashEvents(
        xrplClient,
        'rGcyRGrZPaJAZbZDi4NqRFLA5GQH63iFpD'
      );

      console.log(result);
    });
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
});
