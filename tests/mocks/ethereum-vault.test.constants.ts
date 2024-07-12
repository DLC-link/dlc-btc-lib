import { BigNumber } from 'ethers';

import { RawVault } from '../../src/models/ethereum-models';

export const TEST_VAULT_1: RawVault = {
  uuid: '0x400ca1a687f9c8241566d334fcb4b33efab8e540b943be1455143284c5afc962',
  protocolContract: '0x6e692DB944162f8b4250aA25eCEe80608457D7a7',
  timestamp: BigNumber.from('0x665da025'),
  valueLocked: BigNumber.from('0x0f4240'),
  valueMinted: BigNumber.from('0x0f4240'),
  creator: '0x0DD4f29E21F10cb2E485cf9bDAb9F2dD1f240Bfa',
  status: 0,
  fundingTxId: '',
  closingTxId: '',
  wdTxId: '',
  btcFeeRecipient: '031131cd88bcea8c1d84da8e034bb24c2f6e748c571922dc363e7e088f5df0436c',
  btcMintFeeBasisPoints: BigNumber.from('0x64'),
  btcRedeemFeeBasisPoints: BigNumber.from('0x64'),
  taprootPubKey: '',
};

export const TEST_VAULT_2: RawVault = {
  uuid: '0x2b898d65df757575417a920aabe518586793bac4fa682f00ad2c33fad2471999',
  protocolContract: '0x980feAeD0D5d3BaFFeb828a27e8b59c0FE78F1f9',
  timestamp: BigNumber.from('0x668e9353'),
  valueLocked: BigNumber.from('0x989680'),
  valueMinted: BigNumber.from('0x989680'),
  creator: '0x980feAeD0D5d3BaFFeb828a27e8b59c0FE78F1f9',
  status: 1,
  fundingTxId: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
  closingTxId: '',
  wdTxId: '032392b61a5c3b0098774465ad61e429fd892615ff2890f849f8eb237a8a59f3ba',
  btcFeeRecipient: '',
  btcMintFeeBasisPoints: BigNumber.from('0x64'),
  btcRedeemFeeBasisPoints: BigNumber.from('0x64'),
  taprootPubKey: 'dc544c17af0887dfc8ca9936755c9fdef0c79bbc8866cd69bf120c71509742d2',
};
