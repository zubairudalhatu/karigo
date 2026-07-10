# Vendor Dashboard Role Test Checklist

Use the seeded Food, Grocery and Market Vendor accounts from `docs/deployment/karigo-staging-demo-accounts.md`.

| Area | Steps | Expected result | Failure signs | Tester notes |
|---|---|---|---|---|
| Login | Open Vendor Dashboard and sign in with one demo vendor. | Vendor lands on own dashboard only. | Admin/customer/rider can access vendor dashboard; session loop. | Test each vendor persona. |
| Dashboard summary | Review metrics. | New/active/completed/rejected orders and settlement info display. | Metrics crash or show another vendor's data. | Data should be vendor-scoped. |
| Orders list | Open orders. | Paid customer orders for this vendor appear. | Other vendor orders visible. | Verify with Food/Grocery/Market accounts. |
| Order detail | Open an order. | Customer summary, items, payment status, delivery address and valid actions visible. | Raw JSON, missing action states. | Sensitive admin notes hidden. |
| Order actions | Accept, preparing, ready-for-pickup, reject with reason where allowed. | Invalid actions disabled; reason requested for rejection. | Out-of-order status accepted. | Admin/rider dispatch should update. |
| Product management | Open products. | Vendor products load; add/edit/availability as supported. | Product belongs to another vendor, broken form. | Include options/add-ons. |
| Product options/add-ons | Inspect product with option groups. | Options display without breaking cart/order flow. | Missing option price, duplicated groups. | Use Jollof Rice or Chicken Suya. |
| Notifications | Open notifications. | Title, message and timestamp are separate. | Concatenated labels/messages. | No delivery OTP or sensitive financial data. |
| Settlements | Open Settlements. | Read-only settlement history, pending and paid summaries. | Admin-only placeholder, mark-paid button visible. | Vendor cannot mark own settlement paid. |
| Payout account setup | Open payout account page. | Account setup/review status displays. | Full account number exposed outside intended context. | Use masked display where applicable. |
| Payout status states | Review pending/verified/rejected/needs update states. | Clear vendor-facing notes. | Vendor can verify own account. | Verification is admin-only. |
| Profile/business details | Open profile if available. | Business info displays for signed-in vendor. | Wrong vendor info. | Record unsupported gaps. |
| Logout | Logout and reopen. | Session clears. | Stale token still grants access. | Retest login. |

Security checks:

- Vendor A cannot see Vendor B orders, settlements, payout accounts or products.
- Vendor cannot call admin settlement or payout verification endpoints.
- No live bank transfer or payout transfer button exists.
