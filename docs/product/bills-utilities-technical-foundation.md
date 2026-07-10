# Bills & Utilities Technical Foundation

KariGO Bills & Utilities is prepared for staging test flows only. The supported service categories are Airtime, Data, Electricity and Cable TV.

This is not a live bills-payment launch. No real airtime, data bundle, electricity token or cable subscription is delivered by the current implementation.

## Current Scope

- Customer can open Bills & Utilities screens from the Customer App.
- Customer can run mock test transactions for Airtime, Data, Electricity and Cable TV.
- Backend stores utility providers, products and transactions separately from delivery orders.
- Admin Portal can monitor utility transaction records and apply staging-safe manual status overrides.
- Seed data includes demo catalogue entries for common Nigerian utility categories.
- Provider abstraction exists for future VTU/utility provider integration.

## Services Covered

- Airtime: MTN, Airtel, Glo, 9mobile demo providers.
- Data: MTN Data, Airtel Data, Glo Data, 9mobile Data demo products.
- Electricity: KEDCO, AEDC, Kaduna Electric, Eko Electric and Ikeja Electric demo providers.
- Cable TV: DSTV, GOtv and Startimes demo products.

These are demo catalogue records only and do not imply provider partnership.

## Transaction Statuses

- `DRAFT`
- `PENDING`
- `PROCESSING`
- `SUCCESSFUL`
- `FAILED`
- `CANCELLED`

The mock provider normally returns successful responses. The test amount `99999` kobo can be used to simulate a safe failed transaction.

## Customer Safety Copy

Customer screens must keep this message visible:

> Bills & Utilities is currently in test mode. No real airtime, data, electricity token or cable subscription will be delivered.

The final button must say `Run Test Transaction`, not `Pay Now`.

## Excluded From This Phase

- Live VTU provider calls.
- Wallet.
- Bank transfers.
- Live card payments for utility purchases.
- Real electricity token fulfilment.
- Real cable subscription fulfilment.
- Refund/reversal automation.
- Provider reconciliation.

## Launch Requirements Before Live Use

- Select and approve a live utility provider.
- Complete sandbox integration and evidence.
- Add provider-side transaction idempotency.
- Add customer limits and fraud controls.
- Add payment authorization and reconciliation.
- Add refund/reversal operating rules.
- Review regulatory and consumer-protection requirements.
