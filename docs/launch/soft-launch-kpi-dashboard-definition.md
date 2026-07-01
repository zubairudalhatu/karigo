# Soft Launch KPI Dashboard Definition

| KPI group | KPIs | Source | Review cadence |
| --- | --- | --- | --- |
| Customer | Registrations, first/repeat orders, promo usage, complaints, support resolution time | Users/orders/promos/support | Daily |
| Orders | Created, paid, completed, completion/cancellation/failed-delivery rates, average order value | Orders/payments/reports | Daily |
| Vendor | Acceptance/rejection rates, preparation time where available, top vendors, complaints | Orders/vendor reports/support | Daily |
| Rider | Online riders, assigned/completed jobs, rejection rate, delivery time where available, earnings | Riders/orders/reports | Daily |
| Finance | GMV, delivery fees, refunds, pending settlements, rider payout due | Finance report/settlements | Daily |
| Technical | API uptime/error rate, crashes, payment verification errors, login failures | Monitoring/logs/provider reports | Live and daily |

## Initial Governance Thresholds

Management must approve numeric pilot thresholds before launch. At minimum define:
completion-rate floor, maximum vendor/rider rejection rates, support response target,
maximum unresolved critical incidents, acceptable refund/dispute rate, and minimum rider
coverage per active zone.

Current API reports support many operational metrics; crash reports, real provider
telemetry, and some timing metrics require external monitoring or future persistence.
