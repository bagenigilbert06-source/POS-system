# Direct KRA OSCU source material

This directory holds the official KRA documents collected for the Direct KRA
OSCU adapter. They are reference material, not runtime assets and must not be
served to the browser.

## Sources

| Document | Version / date | Source | Retrieved |
| --- | --- | --- | --- |
| `OSCU_Specification_Document_v2.0.pdf` | v2.0 | [KRA OSCU Specification](https://kra.go.ke/images/publications/OSCU_Specification_Document_v2.0.pdf) | 2026-09-07 |
| `TIS-for-OSCU-VSCU-Technical-Specifications-v2.0.pdf` | v2.0, April 2023 | [KRA TIS OSCU/VSCU technical specification](https://www.kra.go.ke/images/publications/TIS-for-OSCU--VSCU-Technical-Specifications-v2.0.pdf) | 2026-09-07 |
| `OSCU_VSCU_Step-by-Step_Guide-v1.1.pdf` | v1.1, April 2023 | Official KRA OSCU/VSCU signup guide supplied with this project | 2026-09-07 |

## Environments

The OSCU specification v2.0 identifies the following API server addresses:

- Sandbox: `https://etims-api-sbx.kra.go.ke/etims-api/`
- Production: `https://etims-api.kra.go.ke/etims-api/`

The KRA OSCU/VSCU Step-by-Step Guide v1.1 (April 2023) instead states the
sandbox host as `https://etims-api-sbx.kra.go.ke` and illustrates device
activation at `/selectInitOsdcInfo`. This is a documented path-prefix
ambiguity. The Direct KRA adapter must obtain its sandbox base URL from the
KRA-issued onboarding material for the registered sandbox account through
`KRA_OSCU_SANDBOX_BASE_URL`; it must not silently select either interpretation.

Pesaby remains **sandbox-only** until a KRA-approved sandbox taxpayer, branch,
and device complete the documented acceptance process. No production endpoint
may be enabled from this codebase without a separate reviewed change.

## Implementation rule

The Direct KRA adapter may serialize only fields, validation rules, response
codes, and operation paths verified in the supplied official documents. The
registered integrator must retain the current sandbox registration guide and
any KRA-issued supplement that defines credentials, certificates/keys, or
environment-specific requirements before running live sandbox operations.
