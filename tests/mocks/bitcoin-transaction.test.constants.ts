import { BitcoinTransaction } from '../../src/models/bitcoin-models';

export const TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_1 =
  '70736274ff0100c5020000000269680a0f87525a598abaf823342a4cb6d632027252e51d242e51c61770f17c990200000000f0ffffff751757d16e395a1da0457531b8a9eed579bdd87f3d60034b179976be5fb5178a0100000000ffffffff0370170000000000001600145a81f36535980769bccc23c196337a78458abd1e80969800000000002251203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de599ec6202901000000160014add70fb03578d3ac85aab80897395bb046223c92000000000001011f302b6d2901000000160014add70fb03578d3ac85aab80897395bb046223c92220202f4d8696f9b275f4e10af63f03bcb7fbba7b1ed44dd9b12a973c8d20212beb8d1483045022100d7788684a0d1f05f35a861f72457a8d1aa7efbfdf1227d3e6cdf72b7feab9f7e02203d57106adbaf190731c0447e990833835c6de86052161e39b06193ad306e80a1010001012b404b4c00000000002251203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de594114bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfce24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a84511440d8fb920db7745d01f2762b6285e10a3d16ef056fd1dc26879eea5dc5410d4da53a458820088e5a22c11ef27527a8db546a0e8997d80b4b3c4f861a6b4410bd482215c1e52a5f154612da28faade658332157966492aa20a523162a8b584682a23dc72645205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc0011720e52a5f154612da28faade658332157966492aa20a523162a8b584682a23dc726011820e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a84511400000000';
// Readable format:
// {
//     "global": {
//       "unsignedTx": {
//         "version": 2,
//         "segwitFlag": false,
//         "inputs": [
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "997cf17017c6512e241de552720232d6b64c2a3423f8ba8a595a52870f0a6869"
//             },
//             "index": 2,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967280
//           },
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "8a17b55fbe7699174b03603d7fd8bd79d5eea9b8317545a01d5a396ed1571775"
//             },
//             "index": 1,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967295
//           }
//         ],
//         "outputs": [
//           {
//             "amount": "6000",
//             "script": {
//               "type": "Uint8Array",
//               "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//             }
//           },
//           {
//             "amount": "10000000",
//             "script": {
//               "type": "Uint8Array",
//               "value": "51203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de59"
//             }
//           },
//           {
//             "amount": "4984981150",
//             "script": {
//               "type": "Uint8Array",
//               "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//             }
//           }
//         ],
//         "lockTime": 0
//       },
//       "txVersion": 2
//     },
//     "inputs": [
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "997cf17017c6512e241de552720232d6b64c2a3423f8ba8a595a52870f0a6869"
//         },
//         "index": 2,
//         "sequence": 4294967280,
//         "witnessUtxo": {
//           "amount": "4989987632",
//           "script": {
//             "type": "Uint8Array",
//             "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//           }
//         },
//         "partialSig": [
//           [
//             {
//               "type": "Uint8Array",
//               "value": "02f4d8696f9b275f4e10af63f03bcb7fbba7b1ed44dd9b12a973c8d20212beb8d1"
//             },
//             {
//               "type": "Uint8Array",
//               "value": "3045022100d7788684a0d1f05f35a861f72457a8d1aa7efbfdf1227d3e6cdf72b7feab9f7e02203d57106adbaf190731c0447e990833835c6de86052161e39b06193ad306e80a101"
//             }
//           ]
//         ]
//       },
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "8a17b55fbe7699174b03603d7fd8bd79d5eea9b8317545a01d5a396ed1571775"
//         },
//         "index": 1,
//         "sequence": 4294967295,
//         "witnessUtxo": {
//           "amount": "5000000",
//           "script": {
//             "type": "Uint8Array",
//             "value": "51203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de59"
//           }
//         },
//         "tapScriptSig": [
//           [
//             {
//               "pubKey": {
//                 "type": "Uint8Array",
//                 "value": "bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfc"
//               },
//               "leafHash": {
//                 "type": "Uint8Array",
//                 "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//               }
//             },
//             {
//               "type": "Uint8Array",
//               "value": "d8fb920db7745d01f2762b6285e10a3d16ef056fd1dc26879eea5dc5410d4da53a458820088e5a22c11ef27527a8db546a0e8997d80b4b3c4f861a6b4410bd48"
//             }
//           ]
//         ],
//         "tapLeafScript": [
//           [
//             {
//               "version": 193,
//               "internalKey": {
//                 "type": "Uint8Array",
//                 "value": "e52a5f154612da28faade658332157966492aa20a523162a8b584682a23dc726"
//               },
//               "merklePath": []
//             },
//             {
//               "type": "Uint8Array",
//               "value": "205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc0"
//             }
//           ]
//         ],
//         "tapInternalKey": {
//           "type": "Uint8Array",
//           "value": "e52a5f154612da28faade658332157966492aa20a523162a8b584682a23dc726"
//         },
//         "tapMerkleRoot": {
//           "type": "Uint8Array",
//           "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//         }
//       }
//     ],
//     "outputs": [
//       {
//         "amount": "6000",
//         "script": {
//           "type": "Uint8Array",
//           "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//         }
//       },
//       {
//         "amount": "10000000",
//         "script": {
//           "type": "Uint8Array",
//           "value": "51203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de59"
//         }
//       },
//       {
//         "amount": "4984981150",
//         "script": {
//           "type": "Uint8Array",
//           "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//         }
//       }
//     ],
//     "opts": {
//       "version": 2,
//       "lockTime": 0,
//       "PSBTVersion": 0
//     }
// }

export const TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_2 =
  '70736274ff0100d1020000000266916a1f40ca9c611a60002f81854402ffb424e457c1c23931d06267cf5bc8950000000000f0ffffff8f5413dcad4cbe8876459a1b1fe1817a94206f0d0bbb79765403438c3bb07dbe0100000000ffffffff0370170000000000001600145a81f36535980769bccc23c196337a78458abd1e8096980000000000225120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254faa59f42400000000225120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be000000000001012b40be402500000000225120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be011340fd74c7650cb7edb0eea5fca080ac7dea90ab23ecf616eac1ad4a263d75fcf3940d3c7c09512369cb39a473e4eb1249204df36115095dc2849556686b9087824e011720bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfc0001012b404b4c0000000000225120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254f4114bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfce24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114404387a71d8174f9c42ef8ce8cbe0c88c01863fb80ea796955f6678b95a7ae7e07dd1559688bee882feefdda2e98880ea6e6ba886c438bdb2188b41f4f68d09f992215c01fba2e8661f2ed0a747d76578d3a6508a31879569d97da86a0a207c2538ebaa445205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc00117201fba2e8661f2ed0a747d76578d3a6508a31879569d97da86a0a207c2538ebaa4011820e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a84511400000000';
// Readable format:
// {
//     "global": {
//       "unsignedTx": {
//         "version": 2,
//         "segwitFlag": false,
//         "inputs": [
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "95c85bcf6762d03139c2c157e424b4ff024485812f00601a619cca401f6a9166"
//             },
//             "index": 0,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967280
//           },
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "be7db03b8c4303547679bb0b0d6f20947a81e11f1b9a457688be4caddc13548f"
//             },
//             "index": 1,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967295
//           }
//         ],
//         "outputs": [
//           {
//             "amount": "6000",
//             "script": {
//               "type": "Uint8Array",
//               "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//             }
//           },
//           {
//             "amount": "10000000",
//             "script": {
//               "type": "Uint8Array",
//               "value": "5120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254f"
//             }
//           },
//           {
//             "amount": "619993514",
//             "script": {
//               "type": "Uint8Array",
//               "value": "5120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be"
//             }
//           }
//         ],
//         "lockTime": 0
//       },
//       "txVersion": 2
//     },
//     "inputs": [
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "95c85bcf6762d03139c2c157e424b4ff024485812f00601a619cca401f6a9166"
//         },
//         "index": 0,
//         "sequence": 4294967280,
//         "witnessUtxo": {
//           "amount": "625000000",
//           "script": {
//             "type": "Uint8Array",
//             "value": "5120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be"
//           }
//         },
//         "tapKeySig": {
//           "type": "Uint8Array",
//           "value": "fd74c7650cb7edb0eea5fca080ac7dea90ab23ecf616eac1ad4a263d75fcf3940d3c7c09512369cb39a473e4eb1249204df36115095dc2849556686b9087824e"
//         },
//         "tapInternalKey": {
//           "type": "Uint8Array",
//           "value": "bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfc"
//         }
//       },
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "be7db03b8c4303547679bb0b0d6f20947a81e11f1b9a457688be4caddc13548f"
//         },
//         "index": 1,
//         "sequence": 4294967295,
//         "witnessUtxo": {
//           "amount": "5000000",
//           "script": {
//             "type": "Uint8Array",
//             "value": "5120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254f"
//           }
//         },
//         "tapScriptSig": [
//           [
//             {
//               "pubKey": {
//                 "type": "Uint8Array",
//                 "value": "bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfc"
//               },
//               "leafHash": {
//                 "type": "Uint8Array",
//                 "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//               }
//             },
//             {
//               "type": "Uint8Array",
//               "value": "4387a71d8174f9c42ef8ce8cbe0c88c01863fb80ea796955f6678b95a7ae7e07dd1559688bee882feefdda2e98880ea6e6ba886c438bdb2188b41f4f68d09f99"
//             }
//           ]
//         ],
//         "tapLeafScript": [
//           [
//             {
//               "version": 192,
//               "internalKey": {
//                 "type": "Uint8Array",
//                 "value": "1fba2e8661f2ed0a747d76578d3a6508a31879569d97da86a0a207c2538ebaa4"
//               },
//               "merklePath": []
//             },
//             {
//               "type": "Uint8Array",
//               "value": "205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc0"
//             }
//           ]
//         ],
//         "tapInternalKey": {
//           "type": "Uint8Array",
//           "value": "1fba2e8661f2ed0a747d76578d3a6508a31879569d97da86a0a207c2538ebaa4"
//         },
//         "tapMerkleRoot": {
//           "type": "Uint8Array",
//           "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//         }
//       }
//     ],
//     "outputs": [
//       {
//         "amount": "6000",
//         "script": {
//           "type": "Uint8Array",
//           "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//         }
//       },
//       {
//         "amount": "10000000",
//         "script": {
//           "type": "Uint8Array",
//           "value": "5120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254f"
//         }
//       },
//       {
//         "amount": "619993514",
//         "script": {
//           "type": "Uint8Array",
//           "value": "5120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be"
//         }
//       }
//     ],
//     "opts": {
//       "version": 2,
//       "lockTime": 0,
//       "PSBTVersion": 0
//     }
//   }

export const TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_3 =
  '70736274ff0100fd17010200000004591440ba8921026ba9c35a08fe1be0b192fa59c328919070216ecc396529adaf0200000000f0ffffffaea70896bc92b479b8dd98d2e706b9c6492cd6f567caf34713c71b10cafd746a0200000000ffffffffbb6f00e7148900daf36a20f08152aebce2ed41085e8bbfc28c8aff796dec4f4f0200000000ffffffffcb6450850a4596027f12d43ce19b624185196fd1831abfda0afffced3e9c0d700100000000ffffffff03001bb700000000001600145a81f36535980769bccc23c196337a78458abd1e402f585402000000225120bca90746e285c10235453757249fcac29178e418bef5492b5add21475f76232a3e539f2601000000160014add70fb03578d3ac85aab80897395bb046223c92000000000001011f10c7202901000000160014add70fb03578d3ac85aab80897395bb046223c92220202f4d8696f9b275f4e10af63f03bcb7fbba7b1ed44dd9b12a973c8d20212beb8d14830450221009a699d65d75cf43a4b9ef89f3717352cb4af3981848e9a406ada7a1a727fc98502207b063ca138901ce774e005ef543cd225c976fb8d1dbfbe5a63d85b96dfaba356010001011f10c7202901000000160014add70fb03578d3ac85aab80897395bb046223c92220202f4d8696f9b275f4e10af63f03bcb7fbba7b1ed44dd9b12a973c8d20212beb8d1483045022100cfd104f2751a744510cc5e07dbb1c48c597db3c69aa48e52de7be379a00db0d40220360c0e608c016a19a4bd19c9235b01f18c6e7998f439475cc8637fdd04d7cecf010001011f10c7202901000000160014add70fb03578d3ac85aab80897395bb046223c92220202f4d8696f9b275f4e10af63f03bcb7fbba7b1ed44dd9b12a973c8d20212beb8d1483045022100de829b10d533c05b3ff7d65caa3503e7d3c16ef5d1a83224c21de63c5f88531d02207d13d47f640aa4f85511293d363af5e7158c328b312e175f9e3e0290eaa54618010001012b404b4c0000000000225120bca90746e285c10235453757249fcac29178e418bef5492b5add21475f76232a4114bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfce24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114406d997b5d10bccd43e8c210c1b21685f866e14d3648954767cd8656311e3cff3b30c3581d4eafd4468a376af3ab8f305118fad37083fca5da48d3ab9953bfa3602215c1d6d94d6dd718c7ad15270bc3e3ed3058d4c2253942ff1c1cbea1b1105fd6cc9145205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc0011720d6d94d6dd718c7ad15270bc3e3ed3058d4c2253942ff1c1cbea1b1105fd6cc91011820e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a84511400000000';
// Readable format:
// {
//     "global": {
//       "unsignedTx": {
//         "version": 2,
//         "segwitFlag": false,
//         "inputs": [
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "afad296539cc6e2170909128c359fa92b1e01bfe085ac3a96b022189ba401459"
//             },
//             "index": 2,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967280
//           },
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "6a74fdca101bc71347f3ca67f5d62c49c6b906e7d298ddb879b492bc9608a7ae"
//             },
//             "index": 2,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967295
//           },
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "4f4fec6d79ff8a8cc2bf8b5e0841ede2bcae5281f0206af3da008914e7006fbb"
//             },
//             "index": 2,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967295
//           },
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "700d9c3eedfcff0adabf1a83d16f198541629be13cd4127f0296450a855064cb"
//             },
//             "index": 1,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967295
//           }
//         ],
//         "outputs": [
//           {
//             "amount": "12000000",
//             "script": {
//               "type": "Uint8Array",
//               "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//             }
//           },
//           {
//             "amount": "10005000000",
//             "script": {
//               "type": "Uint8Array",
//               "value": "5120bca90746e285c10235453757249fcac29178e418bef5492b5add21475f76232a"
//             }
//           },
//           {
//             "amount": "4942943038",
//             "script": {
//               "type": "Uint8Array",
//               "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//             }
//           }
//         ],
//         "lockTime": 0
//       },
//       "txVersion": 2
//     },
//     "inputs": [
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "afad296539cc6e2170909128c359fa92b1e01bfe085ac3a96b022189ba401459"
//         },
//         "index": 2,
//         "sequence": 4294967280,
//         "witnessUtxo": {
//           "amount": "4984981264",
//           "script": {
//             "type": "Uint8Array",
//             "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//           }
//         },
//         "partialSig": [
//           [
//             {
//               "type": "Uint8Array",
//               "value": "02f4d8696f9b275f4e10af63f03bcb7fbba7b1ed44dd9b12a973c8d20212beb8d1"
//             },
//             {
//               "type": "Uint8Array",
//               "value": "30450221009a699d65d75cf43a4b9ef89f3717352cb4af3981848e9a406ada7a1a727fc98502207b063ca138901ce774e005ef543cd225c976fb8d1dbfbe5a63d85b96dfaba35601"
//             }
//           ]
//         ]
//       },
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "6a74fdca101bc71347f3ca67f5d62c49c6b906e7d298ddb879b492bc9608a7ae"
//         },
//         "index": 2,
//         "sequence": 4294967295,
//         "witnessUtxo": {
//           "amount": "4984981264",
//           "script": {
//             "type": "Uint8Array",
//             "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//           }
//         },
//         "partialSig": [
//           [
//             {
//               "type": "Uint8Array",
//               "value": "02f4d8696f9b275f4e10af63f03bcb7fbba7b1ed44dd9b12a973c8d20212beb8d1"
//             },
//             {
//               "type": "Uint8Array",
//               "value": "3045022100cfd104f2751a744510cc5e07dbb1c48c597db3c69aa48e52de7be379a00db0d40220360c0e608c016a19a4bd19c9235b01f18c6e7998f439475cc8637fdd04d7cecf01"
//             }
//           ]
//         ]
//       },
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "4f4fec6d79ff8a8cc2bf8b5e0841ede2bcae5281f0206af3da008914e7006fbb"
//         },
//         "index": 2,
//         "sequence": 4294967295,
//         "witnessUtxo": {
//           "amount": "4984981264",
//           "script": {
//             "type": "Uint8Array",
//             "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//           }
//         },
//         "partialSig": [
//           [
//             {
//               "type": "Uint8Array",
//               "value": "02f4d8696f9b275f4e10af63f03bcb7fbba7b1ed44dd9b12a973c8d20212beb8d1"
//             },
//             {
//               "type": "Uint8Array",
//               "value": "3045022100de829b10d533c05b3ff7d65caa3503e7d3c16ef5d1a83224c21de63c5f88531d02207d13d47f640aa4f85511293d363af5e7158c328b312e175f9e3e0290eaa5461801"
//             }
//           ]
//         ]
//       },
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "700d9c3eedfcff0adabf1a83d16f198541629be13cd4127f0296450a855064cb"
//         },
//         "index": 1,
//         "sequence": 4294967295,
//         "witnessUtxo": {
//           "amount": "5000000",
//           "script": {
//             "type": "Uint8Array",
//             "value": "5120bca90746e285c10235453757249fcac29178e418bef5492b5add21475f76232a"
//           }
//         },
//         "tapScriptSig": [
//           [
//             {
//               "pubKey": {
//                 "type": "Uint8Array",
//                 "value": "bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfc"
//               },
//               "leafHash": {
//                 "type": "Uint8Array",
//                 "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//               }
//             },
//             {
//               "type": "Uint8Array",
//               "value": "6d997b5d10bccd43e8c210c1b21685f866e14d3648954767cd8656311e3cff3b30c3581d4eafd4468a376af3ab8f305118fad37083fca5da48d3ab9953bfa360"
//             }
//           ]
//         ],
//         "tapLeafScript": [
//           [
//             {
//               "version": 193,
//               "internalKey": {
//                 "type": "Uint8Array",
//                 "value": "d6d94d6dd718c7ad15270bc3e3ed3058d4c2253942ff1c1cbea1b1105fd6cc91"
//               },
//               "merklePath": []
//             },
//             {
//               "type": "Uint8Array",
//               "value": "205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc0"
//             }
//           ]
//         ],
//         "tapInternalKey": {
//           "type": "Uint8Array",
//           "value": "d6d94d6dd718c7ad15270bc3e3ed3058d4c2253942ff1c1cbea1b1105fd6cc91"
//         },
//         "tapMerkleRoot": {
//           "type": "Uint8Array",
//           "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//         }
//       }
//     ],
//     "outputs": [
//       {
//         "amount": "12000000",
//         "script": {
//           "type": "Uint8Array",
//           "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//         }
//       },
//       {
//         "amount": "10005000000",
//         "script": {
//           "type": "Uint8Array",
//           "value": "5120bca90746e285c10235453757249fcac29178e418bef5492b5add21475f76232a"
//         }
//       },
//       {
//         "amount": "4942943038",
//         "script": {
//           "type": "Uint8Array",
//           "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//         }
//       }
//     ],
//     "opts": {
//       "version": 2,
//       "lockTime": 0,
//       "PSBTVersion": 0
//     }
//   }

export const TEST_WITHDRAW_PSBT_PARTIALLY_SIGNED_WITHDRAW_PSBT_1 =
  '70736274ff01009c0200000001acf3a308a937ebcc2464fa33f99f1197145b49a7124a72f5511666649d3236030000000000f0ffffff034c1d0000000000001600145a81f36535980769bccc23c196337a78458abd1e404b4c00000000002251203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de599a2c4c0000000000160014add70fb03578d3ac85aab80897395bb046223c92000000000001012b80969800000000002251203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de594114bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfce24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a84511440525267fb9b7ea3797aad490251906662f24599c086733a95f33aa1c25c6e47d408d58c8be7a56edb491d56741744e85b746366f9175754f053a7703e69f6ab392215c1e52a5f154612da28faade658332157966492aa20a523162a8b584682a23dc72645205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc0011720e52a5f154612da28faade658332157966492aa20a523162a8b584682a23dc726011820e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a84511400000000';
// Readable format:
// {
//     "global": {
//       "unsignedTx": {
//         "version": 2,
//         "segwitFlag": false,
//         "inputs": [
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "0336329d64661651f5724a12a7495b1497119ff933fa6424cceb37a908a3f3ac"
//             },
//             "index": 0,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967280
//           }
//         ],
//         "outputs": [
//           {
//             "amount": "7500",
//             "script": {
//               "type": "Uint8Array",
//               "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//             }
//           },
//           {
//             "amount": "5000000",
//             "script": {
//               "type": "Uint8Array",
//               "value": "51203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de59"
//             }
//           },
//           {
//             "amount": "4992154",
//             "script": {
//               "type": "Uint8Array",
//               "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//             }
//           }
//         ],
//         "lockTime": 0
//       },
//       "txVersion": 2
//     },
//     "inputs": [
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "0336329d64661651f5724a12a7495b1497119ff933fa6424cceb37a908a3f3ac"
//         },
//         "index": 0,
//         "sequence": 4294967280,
//         "witnessUtxo": {
//           "amount": "10000000",
//           "script": {
//             "type": "Uint8Array",
//             "value": "51203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de59"
//           }
//         },
//         "tapScriptSig": [
//           [
//             {
//               "pubKey": {
//                 "type": "Uint8Array",
//                 "value": "bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfc"
//               },
//               "leafHash": {
//                 "type": "Uint8Array",
//                 "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//               }
//             },
//             {
//               "type": "Uint8Array",
//               "value": "525267fb9b7ea3797aad490251906662f24599c086733a95f33aa1c25c6e47d408d58c8be7a56edb491d56741744e85b746366f9175754f053a7703e69f6ab39"
//             }
//           ]
//         ],
//         "tapLeafScript": [
//           [
//             {
//               "version": 193,
//               "internalKey": {
//                 "type": "Uint8Array",
//                 "value": "e52a5f154612da28faade658332157966492aa20a523162a8b584682a23dc726"
//               },
//               "merklePath": []
//             },
//             {
//               "type": "Uint8Array",
//               "value": "205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc0"
//             }
//           ]
//         ],
//         "tapInternalKey": {
//           "type": "Uint8Array",
//           "value": "e52a5f154612da28faade658332157966492aa20a523162a8b584682a23dc726"
//         },
//         "tapMerkleRoot": {
//           "type": "Uint8Array",
//           "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//         }
//       }
//     ],
//     "outputs": [
//       {
//         "amount": "7500",
//         "script": {
//           "type": "Uint8Array",
//           "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//         }
//       },
//       {
//         "amount": "5000000",
//         "script": {
//           "type": "Uint8Array",
//           "value": "51203789ed985ab9d1c94f5889973376a88d9940835206461151685a7a3fbb84de59"
//         }
//       },
//       {
//         "amount": "4992154",
//         "script": {
//           "type": "Uint8Array",
//           "value": "0014add70fb03578d3ac85aab80897395bb046223c92"
//         }
//       }
//     ],
//     "opts": {
//       "version": 2,
//       "lockTime": 0,
//       "PSBTVersion": 0
//     }
//   }

export const TEST_WITHDRAW_PSBT_PARTIALLY_SIGNED_WITHDRAW_PSBT_2 =
  '70736274ff0100a80200000001b2097c129d74fc6e80d673ba3a83e4858c046444993991cad52f66d28ff65b970000000000f0ffffff034c1d0000000000001600145a81f36535980769bccc23c196337a78458abd1e404b4c0000000000225120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254f822c4c0000000000225120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be000000000001012b8096980000000000225120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254f4114bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfce24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a84511440c06edfdd88bc66ffec4c8ff30fd3f6b38e25ebd85c09635a7b1594f66af614ba320c4d98e1c6017f38c8d752227ca24a5cd178cb462a4444c465fc773738e4b52215c01fba2e8661f2ed0a747d76578d3a6508a31879569d97da86a0a207c2538ebaa445205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc00117201fba2e8661f2ed0a747d76578d3a6508a31879569d97da86a0a207c2538ebaa4011820e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a84511400000000';
// Readable format:
// {
//     "global": {
//       "unsignedTx": {
//         "version": 2,
//         "segwitFlag": false,
//         "inputs": [
//           {
//             "txid": {
//               "type": "Uint8Array",
//               "value": "975bf68fd2662fd5ca9139994464048c85e4833aba73d6806efc749d127c09b2"
//             },
//             "index": 0,
//             "finalScriptSig": {
//               "type": "Uint8Array",
//               "value": ""
//             },
//             "sequence": 4294967280
//           }
//         ],
//         "outputs": [
//           {
//             "amount": "7500",
//             "script": {
//               "type": "Uint8Array",
//               "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//             }
//           },
//           {
//             "amount": "5000000",
//             "script": {
//               "type": "Uint8Array",
//               "value": "5120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254f"
//             }
//           },
//           {
//             "amount": "4992130",
//             "script": {
//               "type": "Uint8Array",
//               "value": "5120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be"
//             }
//           }
//         ],
//         "lockTime": 0
//       },
//       "txVersion": 2
//     },
//     "inputs": [
//       {
//         "finalScriptSig": {
//           "type": "Uint8Array",
//           "value": ""
//         },
//         "txid": {
//           "type": "Uint8Array",
//           "value": "975bf68fd2662fd5ca9139994464048c85e4833aba73d6806efc749d127c09b2"
//         },
//         "index": 0,
//         "sequence": 4294967280,
//         "witnessUtxo": {
//           "amount": "10000000",
//           "script": {
//             "type": "Uint8Array",
//             "value": "5120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254f"
//           }
//         },
//         "tapScriptSig": [
//           [
//             {
//               "pubKey": {
//                 "type": "Uint8Array",
//                 "value": "bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfc"
//               },
//               "leafHash": {
//                 "type": "Uint8Array",
//                 "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//               }
//             },
//             {
//               "type": "Uint8Array",
//               "value": "c06edfdd88bc66ffec4c8ff30fd3f6b38e25ebd85c09635a7b1594f66af614ba320c4d98e1c6017f38c8d752227ca24a5cd178cb462a4444c465fc773738e4b5"
//             }
//           ]
//         ],
//         "tapLeafScript": [
//           [
//             {
//               "version": 192,
//               "internalKey": {
//                 "type": "Uint8Array",
//                 "value": "1fba2e8661f2ed0a747d76578d3a6508a31879569d97da86a0a207c2538ebaa4"
//               },
//               "merklePath": []
//             },
//             {
//               "type": "Uint8Array",
//               "value": "205216652630455eb8546bbab45e6fdef6498eee683ed339f405d326414b05b192ad20bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfcacc0"
//             }
//           ]
//         ],
//         "tapInternalKey": {
//           "type": "Uint8Array",
//           "value": "1fba2e8661f2ed0a747d76578d3a6508a31879569d97da86a0a207c2538ebaa4"
//         },
//         "tapMerkleRoot": {
//           "type": "Uint8Array",
//           "value": "e24db130ab82d20d322c295aa18921a7fe87fb13df3d5b3b2ee0469e2a845114"
//         }
//       }
//     ],
//     "outputs": [
//       {
//         "amount": "7500",
//         "script": {
//           "type": "Uint8Array",
//           "value": "00145a81f36535980769bccc23c196337a78458abd1e"
//         }
//       },
//       {
//         "amount": "5000000",
//         "script": {
//           "type": "Uint8Array",
//           "value": "5120b033a3d9562d22aa4a5476ae9cb6a5858b0959e084b49a3fd92edfba87e8254f"
//         }
//       },
//       {
//         "amount": "4992130",
//         "script": {
//           "type": "Uint8Array",
//           "value": "5120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be"
//         }
//       }
//     ],
//     "opts": {
//       "version": 2,
//       "lockTime": 0,
//       "PSBTVersion": 0
//     }
//   }

export const TEST_FUNDING_PSBT_PARTIALLY_SIGNED_WITHDRAW_PSBT_1 =
  '70736274ff0100a80200000001dcd01b1b19b0f64371bcf4dad0483f963cec83e635b1a650e3bba6dfb91137420000000000f0ffffff0340420f0000000000225120dcdc93b920e39fe9c6efd225dca8cd4fe7bbf873dc8effeb5286159857d7bb1c1027000000000000160014622c23eebbf46df254d7da8e1c4d95d4f5c7d69fcc74e60500000000225120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be000000000001012b00e1f50500000000225120676504fcaf89119cc9762c2f867aaa56aa3fffc85158f7dd61da345cdbf4a9be011720bb7e175e63064479102ee0b69a719a9f54f8f1b29df17cfaa5437697393e7cfc00000000';
// Readable format:
// {
//   global: { txVersion: 2 },
//   inputs: [
//     {
//       tapInternalKey: <Buffer bb 7e 17 5e 63 06 44 79 10 2e e0 b6 9a 71 9a 9f 54 f8 f1 b2 9d f1 7c fa a5 43 76 97 39 3e 7c fc>,
//       txid: [Uint8Array],
//       index: 0,
//       witnessUtxo: [Object],
//       sequence: 4294967280
//     }
//   ],
//   outputs: [
//     { amount: 1000000n, script: [Uint8Array] },
//     { amount: 10000n, script: [Uint8Array] },
//     { amount: 98989260n, script: [Uint8Array] }
//   ],
//   opts: {
//     createTx: true,
//     bip69: false,
//     changeAddress: 'bcrt1pvajsfl903ygeejtk9shcv742264rll7g29v00htpmg69ekl54xlq8eddah',
//     feePerByte: 4n,
//     network: {
//       messagePrefix: '\x18Bitcoin Signed Message:\n',
//       bech32: 'bcrt',
//       bip32: [Object],
//       pubKeyHash: 111,
//       scriptHash: 196,
//       wif: 239
//     },
//     dust: 546n,
//     version: 2,
//     lockTime: 0,
//     PSBTVersion: 0
//   }
// }

// This is a testnet funding transaction with valid inputs and outputs
export const TEST_TESTNET_FUNDING_TRANSACTION_1: BitcoinTransaction = {
  txid: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: 'cefbeafc3e50618a59646ba6e7b3bba8f15b3e2551570af98182f4234586d085',
      vout: 2,
      prevout: {
        scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
        value: 71607616,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        'd4ad3523fdc9ec709e8bf2ecadd56c9266f9c57bccb5d165cd57dc815a88de34957764482a6fab3897ce7be2677168f69be93d799021b502899b556436c3f6bb',
      ],
      is_coinbase: false,
      sequence: 4294967280,
    },
  ],
  vout: [
    {
      scriptpubkey: '51206d7e5019c795d05fd3df81713069aa3a309e912a61555ab3ebd6e477f42c1f70',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 6d7e5019c795d05fd3df81713069aa3a309e912a61555ab3ebd6e477f42c1f70',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1pd4l9qxw8jhg9l57ls9cnq6d28gcfayf2v9244vlt6mj80apvracqgdt090',
      value: 10000000,
    },
    {
      scriptpubkey: '0014f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'tb1q728vrglrmupypwv9st98w48xjj8fh7fs8mrdre',
      value: 100000,
    },
    {
      scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
      value: 61490226,
    },
  ],
  size: 236,
  weight: 740,
  fee: 17390,
  status: {
    confirmed: true,
    block_height: 2867279,
    block_hash: '000000000000001ee12e0297ff36e8c8041aefb65af0c1033a1af4fdb8146f0d',
    block_time: 1720620175,
  },
};

// This transaction is missing the output with the multisig's script.
export const TEST_TESTNET_FUNDING_TRANSACTION_2: BitcoinTransaction = {
  txid: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: 'cefbeafc3e50618a59646ba6e7b3bba8f15b3e2551570af98182f4234586d085',
      vout: 2,
      prevout: {
        scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
        value: 71607616,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        'd4ad3523fdc9ec709e8bf2ecadd56c9266f9c57bccb5d165cd57dc815a88de34957764482a6fab3897ce7be2677168f69be93d799021b502899b556436c3f6bb',
      ],
      is_coinbase: false,
      sequence: 4294967280,
    },
  ],
  vout: [
    {
      scriptpubkey: '0014f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'tb1q728vrglrmupypwv9st98w48xjj8fh7fs8mrdre',
      value: 100000,
    },
    {
      scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
      value: 61490226,
    },
  ],
  size: 236,
  weight: 740,
  fee: 17390,
  status: {
    confirmed: true,
    block_height: 2867279,
    block_hash: '000000000000001ee12e0297ff36e8c8041aefb65af0c1033a1af4fdb8146f0d',
    block_time: 1720620175,
  },
};

// This transaction's multisig output value does not match the vault's valueLocked field.
export const TEST_TESTNET_FUNDING_TRANSACTION_3: BitcoinTransaction = {
  txid: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: 'cefbeafc3e50618a59646ba6e7b3bba8f15b3e2551570af98182f4234586d085',
      vout: 2,
      prevout: {
        scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
        value: 71607616,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        'd4ad3523fdc9ec709e8bf2ecadd56c9266f9c57bccb5d165cd57dc815a88de34957764482a6fab3897ce7be2677168f69be93d799021b502899b556436c3f6bb',
      ],
      is_coinbase: false,
      sequence: 4294967280,
    },
  ],
  vout: [
    {
      scriptpubkey: '51206d7e5019c795d05fd3df81713069aa3a309e912a61555ab3ebd6e477f42c1f70',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 6d7e5019c795d05fd3df81713069aa3a309e912a61555ab3ebd6e477f42c1f70',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1pd4l9qxw8jhg9l57ls9cnq6d28gcfayf2v9244vlt6mj80apvracqgdt090',
      value: 5000000,
    },
    {
      scriptpubkey: '0014f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'tb1q728vrglrmupypwv9st98w48xjj8fh7fs8mrdre',
      value: 100000,
    },
    {
      scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
      value: 61490226,
    },
  ],
  size: 236,
  weight: 740,
  fee: 17390,
  status: {
    confirmed: true,
    block_height: 2867279,
    block_hash: '000000000000001ee12e0297ff36e8c8041aefb65af0c1033a1af4fdb8146f0d',
    block_time: 1720620175,
  },
};

export const TEST_REGTEST_FUNDING_TRANSACTION_1: BitcoinTransaction = {
  txid: 'e0e1ddc044ba87ad769039f7af507556724defe4576c872dd1271e5740422e37',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: '1b78a88cea3871f0404eae7f94789d3fde0828d73f91ec68fb85d8b0f940650d',
      vout: 2,
      prevout: {
        scriptpubkey: '0014b500f5f6ce6b3aa7f5a871c49ab08ff38b451501',
        scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 b500f5f6ce6b3aa7f5a871c49ab08ff38b451501',
        scriptpubkey_type: 'v0_p2wpkh',
        scriptpubkey_address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
        value: 21848076,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        '3044022059f91dfec1d446de68d16b3841158fe059409feec8e5871a4251b93fc94f10e102202dfd021e88f96454eb472850a41464bcbb50ce7c6f7a831f196ecf043f342abc01',
        '02ab6fdbc88fb3d52dc83e5e92f27d26bfc3d161d24b50fa299f3c571f0d5a3220',
      ],
      is_coinbase: false,
      sequence: 4294967280,
    },
  ],
  vout: [
    {
      scriptpubkey: '5120742398e7f09cf7e3516d9ddee465f51f5945efed82df5ee0491da2b900db4d63',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 742398e7f09cf7e3516d9ddee465f51f5945efed82df5ee0491da2b900db4d63',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'bcrt1pws3e3elsnnm7x5tdnh0wge04rav5tmldst04aczfrk3tjqxmf43sq7ep3c',
      value: 5000000,
    },
    {
      scriptpubkey: '0014622c23eebbf46df254d7da8e1c4d95d4f5c7d69f',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 622c23eebbf46df254d7da8e1c4d95d4f5c7d69f',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'bcrt1qvgkz8m4m73kly4xhm28pcnv46n6u045lfq9ta3',
      value: 6000,
    },
    {
      scriptpubkey: '0014b500f5f6ce6b3aa7f5a871c49ab08ff38b451501',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 b500f5f6ce6b3aa7f5a871c49ab08ff38b451501',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
      value: 16841708,
    },
  ],
  size: 265,
  weight: 733,
  fee: 368,
  status: {
    confirmed: true,
    block_height: 425893,
    block_hash: '4c08cbb2509350b5673ebf0baed1f4b501ee8f61436e9e3ddf153a0250e2614a',
    block_time: 1722953216,
  },
};

// This transaction is missing the output with the multisig's script.
export const TEST_MAINNET_FUNDING_TRANSACTION_1: BitcoinTransaction = {
  txid: '2a220f043ff34cfca57d910209fa676c82220a817da5ebf09f145cc012d8a85c',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: '2e9d09f8304b6bdf635adeef799fb9f4e2434bca508eecb35adb41480e24aec3',
      vout: 0,
      prevout: {
        scriptpubkey: '5120ec1354cc8defd6ced2fed85e6921473f7d9e6157974a29d6156ae71d83bf8266',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 ec1354cc8defd6ced2fed85e6921473f7d9e6157974a29d6156ae71d83bf8266',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: 'bc1pasf4fnydaltva5h7mp0xjg288a7euc2hja9zn4s4dtn3mqalsfnqckzx6z',
        value: 1000000,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        '3dd16b2aa465cfef33fd82d02ca2d21dd095b1ada92b36ce8042faed22eaaf1495304344ed40a1ada5e79845b16fee867b4e104fb820eaefd9dfec7e20ec8e07',
        'f4f3648bff8c887b18c586fdb5642ddde361cec802498c25a8d86d510c721ec30a515c87bbfc72f2ef6c9c5e60cc261a458276558c226a133c9311ddf54960cb',
        '20b362931e3e4cf3cc20f75ae11ff5a4c115ec1548cb5f2c7c48294929f1e8979cad20fc36ff16e336657e6ab87bf5ad19ce538ca94e0a52e12a9fd9b65291d296866cac',
        'c15d741aac77028f6c72167559fe4f8b2ba34b1078648dd621b31411ca2178227f',
      ],
      is_coinbase: false,
      sequence: 4294967295,
    },
  ],
  vout: [
    {
      scriptpubkey: '00142d2d0c13815a141129c9df2ab9b68344398de74b',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 2d2d0c13815a141129c9df2ab9b68344398de74b',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'bc1q95kscyuptg2pz2wfmu4tnd5rgsucme6tpx900g',
      value: 10000,
    },
    {
      scriptpubkey: '001405b8d44eb1d67d47192c6168a24cb4e5b5a7b438',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 05b8d44eb1d67d47192c6168a24cb4e5b5a7b438',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'bc1qqkudgn436e75wxfvv952yn95uk660dpc7ve7vq',
      value: 987400,
    },
  ],
  size: 349,
  weight: 688,
  fee: 2600,
  status: {
    confirmed: true,
    block_height: 846609,
    block_hash: '00000000000000000001484d3e7d39acef1604da54d206ed1d52da0af5527522',
    block_time: 1717580151,
  },
};

export const TEST_TESTNET_FUNDING_TRANSACTION_4: BitcoinTransaction = {
  txid: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: 'cefbeafc3e50618a59646ba6e7b3bba8f15b3e2551570af98182f4234586d085',
      vout: 2,
      prevout: {
        scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
        value: 71607616,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        'd4ad3523fdc9ec709e8bf2ecadd56c9266f9c57bccb5d165cd57dc815a88de34957764482a6fab3897ce7be2677168f69be93d799021b502899b556436c3f6bb',
      ],
      is_coinbase: false,
      sequence: 4294967280,
    },
    {
      txid: 'cefbeafc3e50618a59646ba6e7b3bba8f15b3e2551570af98182f4234586d085',
      vout: 2,
      prevout: {
        scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: 'tb1pd4l9qxw8jhg9l57ls9cnq6d28gcfayf2v9244vlt6mj80apvracqgdt090',
        value: 71607616,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        'd4ad3523fdc9ec709e8bf2ecadd56c9266f9c57bccb5d165cd57dc815a88de34957764482a6fab3897ce7be2677168f69be93d799021b502899b556436c3f6bb',
      ],
      is_coinbase: false,
      sequence: 4294967280,
    },
  ],
  vout: [
    {
      scriptpubkey: '0014f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'tb1q728vrglrmupypwv9st98w48xjj8fh7fs8mrdre',
      value: 100000,
    },
    {
      scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
      value: 61490226,
    },
  ],
  size: 236,
  weight: 740,
  fee: 17390,
  status: {
    confirmed: true,
    block_height: 2867279,
    block_hash: '000000000000001ee12e0297ff36e8c8041aefb65af0c1033a1af4fdb8146f0d',
    block_time: 1720620175,
  },
};

export const TEST_TESTNET_FUNDING_TRANSACTION_5: BitcoinTransaction = {
  txid: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: 'cefbeafc3e50618a59646ba6e7b3bba8f15b3e2551570af98182f4234586d085',
      vout: 2,
      prevout: {
        scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: 'tb1pd4l9qxw8jhg9l57ls9cnq6d28gcfayf2v9244vlt6mj80apvracqgdt090',
        value: 71607616,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        'd4ad3523fdc9ec709e8bf2ecadd56c9266f9c57bccb5d165cd57dc815a88de34957764482a6fab3897ce7be2677168f69be93d799021b502899b556436c3f6bb',
      ],
      is_coinbase: false,
      sequence: 4294967280,
    },
  ],
  vout: [
    {
      scriptpubkey: '0014f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'tb1q728vrglrmupypwv9st98w48xjj8fh7fs8mrdre',
      value: 100000,
    },
    {
      scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq',
      value: 61490226,
    },
    {
      scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address: 'tb1pd4l9qxw8jhg9l57ls9cnq6d28gcfayf2v9244vlt6mj80apvracqgdt090',
      value: 61490226,
    },
  ],
  size: 236,
  weight: 740,
  fee: 17390,
  status: {
    confirmed: true,
    block_height: 2867279,
    block_hash: '000000000000001ee12e0297ff36e8c8041aefb65af0c1033a1af4fdb8146f0d',
    block_time: 1720620175,
  },
};

export const TEST_TESTNET_FUNDING_TRANSACTION_6: BitcoinTransaction = {
  txid: '4cf5c2954c84bf5225d98ef014aa97bbfa0f05d56b5749782fcd8af8b9d505a5',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: 'cefbeafc3e50618a59646ba6e7b3bba8f15b3e2551570af98182f4234586d085',
      vout: 2,
      prevout: {
        scriptpubkey: '5120192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 192d65c33b86bc129d606c12f0183569d42732d59cad3bf208a9a9fd3b138248',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address: 'tb1pd4l9qxw8jhg9l57ls9cnq6d28gcfayf2v9244vlt6mj80apvracqgdt090',
        value: 71607616,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        'd4ad3523fdc9ec709e8bf2ecadd56c9266f9c57bccb5d165cd57dc815a88de34957764482a6fab3897ce7be2677168f69be93d799021b502899b556436c3f6bb',
      ],
      is_coinbase: false,
      sequence: 4294967280,
    },
  ],
  vout: [
    {
      scriptpubkey: '0014f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_asm: 'OP_0 OP_PUSHBYTES_20 f28ec1a3e3df0240b98582ca7754e6948e9bf930',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'tb1q728vrglrmupypwv9st98w48xjj8fh7fs8mrdre',
      value: 100000,
    },
  ],
  size: 236,
  weight: 740,
  fee: 17390,
  status: {
    confirmed: true,
    block_height: 2867279,
    block_hash: '000000000000001ee12e0297ff36e8c8041aefb65af0c1033a1af4fdb8146f0d',
    block_time: 1720620175,
  },
};

export const TEST_ALICE_UTXOS_REGTEST_1 = [
  {
    type: 'wpkh',
    script: Uint8Array.from([
      0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
      21, 1,
    ]),
    address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
    txid: '9d019c793eab883ffdc4f897e2103c325b83a597ebcd131a411d56e757b85287',
    index: 2,
    value: 987654,
    witnessUtxo: {
      script: Uint8Array.from([
        0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
        21, 1,
      ]),
      amount: 987654n,
    },
    redeemScript: undefined,
  },
  {
    type: 'wpkh',
    script: Uint8Array.from([
      0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
      21, 1,
    ]),
    address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
    txid: '7ba3319248110169f45e7ae9015826f342f9f32ccf1354c4c0806e74555367d8',
    index: 2,
    value: 2963654,
    witnessUtxo: {
      script: Uint8Array.from([
        0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
        21, 1,
      ]),
      amount: 2963654n,
    },
    redeemScript: undefined,
  },
  {
    type: 'wpkh',
    script: Uint8Array.from([
      0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
      21, 1,
    ]),
    address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
    txid: 'e3bf8b78346265ab3a69329fb006a0febdf1e75682d2c9321ee546174765e804',
    index: 2,
    value: 987654,
    witnessUtxo: {
      script: Uint8Array.from([
        0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
        21, 1,
      ]),
      amount: 987654n,
    },
    redeemScript: undefined,
  },
  {
    type: 'wpkh',
    script: Uint8Array.from([
      0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
      21, 1,
    ]),
    address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
    txid: '8c741d8fae3b71ee27fb19e86ed066673090726da4d5972d4b5119e548fb94a0',
    index: 2,
    value: 987654,
    witnessUtxo: {
      script: Uint8Array.from([
        0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
        21, 1,
      ]),
      amount: 987654n,
    },
    redeemScript: undefined,
  },
  {
    type: 'wpkh',
    script: Uint8Array.from([
      0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
      21, 1,
    ]),
    address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
    txid: 'deaeafeadc87e0277e07ccecc733a3524515b1aa412de3f418d9976ba70ef450',
    index: 1,
    value: 987740,
    witnessUtxo: {
      script: Uint8Array.from([
        0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
        21, 1,
      ]),
      amount: 987740n,
    },
    redeemScript: undefined,
  },
  {
    type: 'wpkh',
    script: Uint8Array.from([
      0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
      21, 1,
    ]),
    address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
    txid: 'e0e1ddc044ba87ad769039f7af507556724defe4576c872dd1271e5740422e37',
    index: 2,
    value: 16841708,
    witnessUtxo: {
      script: Uint8Array.from([
        0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
        21, 1,
      ]),
      amount: 16841708n,
    },
    redeemScript: undefined,
  },
  {
    type: 'wpkh',
    script: Uint8Array.from([
      0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
      21, 1,
    ]),
    address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
    txid: '48893733ae068391cfcf688a345a152595b63ac56f5b8c3228bb1f0adf8e0591',
    index: 2,
    value: 987654,
    witnessUtxo: {
      script: Uint8Array.from([
        0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
        21, 1,
      ]),
      amount: 987654n,
    },
    redeemScript: undefined,
  },
];

export const TEST_ALICE_UTXOS_REGTEST_2 = [
  {
    type: 'wpkh',
    script: Uint8Array.from([
      0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
      21, 1,
    ]),
    address: 'bcrt1qk5q0takwdva20adgw8zf4vy07w9529gpfkrv6v',
    txid: '9d019c793eab883ffdc4f897e2103c325b83a597ebcd131a411d56e757b85287',
    index: 2,
    value: 500000,
    witnessUtxo: {
      script: Uint8Array.from([
        0, 20, 181, 0, 245, 246, 206, 107, 58, 167, 245, 168, 113, 196, 154, 176, 143, 243, 139, 69,
        21, 1,
      ]),
      amount: 500000n,
    },
    redeemScript: undefined,
  },
];
