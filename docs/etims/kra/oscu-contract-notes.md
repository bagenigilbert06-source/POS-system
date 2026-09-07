# KRA OSCU v2.0 contract notes

Verified against KRA **Online Sales Control Unit Requirements & Communication
Protocols v2.0 (April 2023)**. Page numbers below are the printed PDF pages.
Nothing in the retired GavaConnect notes is part of this contract.

`CHAR` lengths are maxima. `NUMBER 18,2` and similar notation is preserved
from KRA (precision, scale). A blank Required cell means KRA does not mark the
response field Y/N; it does not mean this implementation invented optionality.

## `/selectInitOsdcInfo` — DeviceVerificationReq/Res (pp. 13–14)

| Direction / object | Field | Type | Req. | Length / format | Structure / example |
| --- | --- | --- | --- | --- | --- |
| Request | `tin` | CHAR | Y | 11 | `A123456789Z` |
| Request | `bhfId` | CHAR | Y | 2 | `00` |
| Request | `dvcSrlNo` | CHAR | Y | 100 | `dvcv1130` |
| Response root | `resultCd`, `resultMsg`, `resultDt` | CHAR | — | 3, —, 14 | `data.info` follows |
| `data.info` / taxpayer | `tin`, `taxprNm`, `bsnsActv` | CHAR | — | 11, 60, 100 | taxpayer information |
| `data.info` / branch | `bhfId`, `bhfNm`, `bhfOpenDt`, `prvncNm`, `dstrtNm`, `sctrNm`, `locDesc`, `hqYn`, `mgrNm`, `mgrTelNo`, `mgrEmail` | CHAR | — | 2, 60, 8, 100, 100, 100, 100, 1, 60, 20, 50 | branch information |
| `data.info` / device | `dvcId`, `sdicId`, `mrcNo`, `cmcKey` | CHAR | — | 20, 18, 11, 255 | device and communication information |

The table spells the control-unit field `sdicId`; the JSON sample spells it
`sdcId`. The adapter preserves and parses the JSON sample spelling and records
this conflict rather than silently rewriting the contract. `cmcKey` is returned
only at the explicit server-secret boundary.

## `/selectItemClsList` — ItemClsSearchReq/Res (pp. 20–21)

| Direction / object | Field | Type | Req. | Length / format | Code table / example |
| --- | --- | --- | --- | --- | --- |
| Request | `tin`, `bhfId`, `cmcKey`, `lastReqDt` | CHAR | Y | 11, 2, 255, 14 (`yyyyMMddhhmmss`) | sample `lastReqDt`: `20180523000000` |
| Response root | `resultCd`, `resultMsg`, `resultDt` | CHAR | — | 3, —, 14 | `data.itemClsList[]` |
| `itemClsList[]` | `itemClsCd`, `itemClsNm`, `itemClsLvl`, `taxTyCd`, `mjrTgYn`, `useYn` | CHAR/NUMBER | — | 10, 200, —, 5, 1, 1 | `taxTyCd`: §4.1 Tax Type |

The request JSON sample omits `cmcKey`, although its field row marks it Y. The
adapter includes it. Code `001` means a successful synchronization with no rows.

## `/saveItem` — ItemSaveReq/Res (pp. 21–23)

| Fields | Type | Req. | Length / format | Reference |
| --- | --- | --- | --- | --- |
| `tin`, `bhfId`, `cmcKey` | CHAR | Y | 11, 2, 255 | initialized device |
| `itemClsCd`, `itemCd`, `itemTyCd`, `itemNm` | CHAR | Y | 10, 20, 5, 200 | item classification; §4.19 item construction; §4.3 product type |
| `itemStdNm` | CHAR | N | 200 | — |
| `orgnNatCd`, `pkgUnitCd`, `qtyUnitCd`, `taxTyCd` | CHAR | Y | 5 each | §§4.4, 4.6, 4.7, 4.1 |
| `btchNo`, `bcd` | CHAR | N | 10, 20 | — |
| `dftPrc` | NUMBER | Y | 18,2 | — |
| `grpPrcL1`…`grpPrcL5` | NUMBER | N | 18,2 | — |
| `addInfo`, `sftyQty` | CHAR/NUMBER | N | 7 / 13,2 | spelling `Safty` retained in description only |
| `isrcAplcbYn`, `useYn` | CHAR | Y | 1 | Y/N |
| `regrId`, `regrNm`, `modrId`, `modrNm` | CHAR | Y | 20, 60, 20, 60 | — |
| Response | CHAR | — | `resultCd` 3, `resultMsg`, `resultDt` 14 | `data: null` in official sample |

The PDF swaps the English descriptions of `itemClsCd` and `itemCd`; exact JSON
field names above are retained. Its sample also omits required `cmcKey`.

## `/saveTrnsSalesOsdc` — TrnsSalesSaveWrReq/Res (pp. 37–42)

| Request fields | Type | Req. | Length / format | Reference |
| --- | --- | --- | --- | --- |
| `tin`, `bhfId`, `cmcKey`, `trdInvcNo` | CHAR | Y | 11, 2, 255, 50 | — |
| `invcNo`, `orgInvcNo` | NUMBER | Y | 38 | original is `0` for sale |
| `custTin`, `custNm` | CHAR | N | 11, 60 | — |
| `salesTyCd` | CHAR | sample only | sample `N` | §4.9 Transaction Type; absent from the field table |
| `rcptTyCd`, `pmtTyCd`, `salesSttsCd` | CHAR | Y, N, Y | 5 each | §§4.10–4.12 |
| `cfmDt`, `salesDt` | CHAR | Y | 14 `yyyyMMddhhmmss`; 8 `yyyyMMdd` | — |
| `stockRlsDt`, `cnclReqDt`, `cnclDt`, `rfdDt` | CHAR | N | 14 `yyyyMMddhhmmss` | — |
| `rfdRsnCd` | CHAR | N | 5 | §4.17 |
| `totItemCnt` | NUMBER | Y | 10 | — |
| `taxblAmtA`…`taxblAmtE` | NUMBER | Y | 18,2 | §4.1 bands |
| `taxRtA`…`taxRtE` | NUMBER | Y | 7,2 | §4.1 bands |
| `taxAmtA`…`taxAmtE` | NUMBER | Y | 18,2 | §4.1 bands |
| `totTaxblAmt`, `totTaxAmt`, `totAmt` | NUMBER | Y | 18,2 | — |
| `prchrAcptcYn`, `remark` | CHAR | Y, N | 1, 400 | unusual spelling retained |
| `regrId`, `regrNm`, `modrId`, `modrNm` | CHAR | Y | 20, 60, 20, 60 | — |
| `receipt.custTin`, `custMblNo`, `rcptPbctDt`, `trdeNm`, `adrs`, `topMsg`, `btmMsg`, `prchrAcptcYn` | CHAR | N, N, Y, N, N, N, N, Y | 11, 20, 14, 20, 200, 20, 20, 1 | nested `receipt` object |
| `itemList[].itemSeq`, `itemClsCd`, `itemCd`, `itemNm`, `bcd` | NUMBER/CHAR | Y, N, Y, Y, N | 3, 10, 20, 200, 20 | — |
| `itemList[].pkgUnitCd`, `pkg`, `qtyUnitCd`, `qty` | CHAR/NUMBER | Y | 5, 13,2, 5, 13,2 | §§4.6–4.7 |
| `itemList[].prc`, `splyAmt`, `dcRt`, `dcAmt` | NUMBER | Y | 18,2; 18,2; 5,2; 18,2 | — |
| `itemList[].isrccCd`, `isrccNm`, `isrcRt`, `isrcAmt` | CHAR/NUMBER | N | 10, 100, 3, 18,2 | insurance |
| `itemList[].taxTyCd`, `taxblAmt`, `totTaxAmt`, `totAmt` | CHAR/NUMBER | Y | 5; 18,2; 18,2; 18,2 | The official sample uses `taxAmt`, while the table says `totTaxAmt`; adapter uses sample spelling and records the conflict. |

The success envelope is `resultCd`, `resultMsg`, `resultDt`, plus
`data.{curRcptNo,totRcptNo,intrlData,rcptSign,sdcDateTime}` with lengths
10, 10, 26, 16, and 14 (`yyyyMMddhhmmss`). The sample accidentally includes
spaces in the JSON keys `curRcptNo ` and `totRcptNo `; these are documented as
sample typographical errors and are not normalized into outbound fields.

## Official mappings

| Internal value | KRA field/code | Official name |
| --- | --- | --- |
| sale | `rcptTyCd=S` | Sale |
| credit note after sale | `rcptTyCd=R` | Credit Note after Sale |
| cash | `pmtTyCd=01` | CASH |
| card | `pmtTyCd=05` | DEBIT&CREDIT CARD |
| M-Pesa | `pmtTyCd=06` | MOBILE MONEY |
| approved sale | `salesSttsCd=02` | Approved |
| generated credit note | `salesSttsCd=05` | Credit Note Generated |

Credit notes use `/saveTrnsSalesOsdc`, not a separate endpoint. They carry
`orgInvcNo`, `rfdDt`, and one official reason: `01` Missing Quantity, `02`
Missing data, `03` Damaged, `04` Wasted, `05` Raw Material Shortage, `06`
Refund. Unknown application reasons map conservatively to Refund.

## Result codes and retry policy

| Internal kind | KRA codes | Retry? |
| --- | --- | --- |
| success / no-result | `000` / `001` | no |
| request error | `891`,`892`,`893`,`895`,`896`,`900`,`910`,`911`,`912` | no |
| communication failure | `894`,`899` | yes |
| invalid/device state | `901`,`902`,`903` | no |
| sales ordering/reception | `921`,`922` | no |
| registration/modification | `991` / `992` | no |
| duplicate/overlap | `994` | no; reconcile |
| deletion/view/file/provider error | `990`,`993`,`995` | no |
| unknown server failure | `999` and undocumented codes | yes, bounded by the existing outbox policy |

## Environment and security boundary

The OSCU v2.0 environment page prints sandbox
`https://etims-api-sbx.kra.go.ke/etims-api/` and production
`https://etims-api.kra.go.ke/etims-api/`. The Step-by-Step v1.1 guide prints
the sandbox host without `/etims-api/`. `apiBaseUrl` or the server-only
`KRA_OSCU_*_BASE_URL` therefore remains mandatory; the adapter does not guess.
No live call is authorized by these notes.

`cmcKey` is obtained from initialization and must be moved immediately into a
private secret manager/environment variable. Only its variable name is stored
in `credentialReference`. Provider errors, normalized responses, audit metadata,
browser JSON, URLs, and ordinary logs never contain it.
