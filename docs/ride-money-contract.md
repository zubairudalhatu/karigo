# Ride monetary-unit contract

Ride pricing is stored and transported as integer **kobo**. UI code must use `formatKobo` for every field whose name ends in `Kobo`; it must never pass those values to a generic naira formatter.

| Field family | Unit | Display rule |
| --- | --- | --- |
| `estimatedFareKobo`, `finalFareKobo` | Integer kobo | `formatKobo` |
| `distanceFareKobo`, `waitingChargeKobo` | Integer kobo | `formatKobo` |
| `perKmKobo`, `waitingChargeKoboPerMinute`, `vatTaxKobo` | Integer kobo | `formatKobo` |
| `karigoCommissionKobo`, `captainNetEstimateKobo` | Integer kobo | `formatKobo` |
| Captain `riderPayout`, settlement and earnings totals | Naira decimal | `formatNaira`; never divide by 100 |
| Product/order/wallet decimal fields without a `Kobo` suffix | Naira decimal | Existing domain-specific naira formatting |

The backend also returns `monetaryUnit: "KOBO"` on Ride fare estimates and trips. Historical records are not rewritten.
