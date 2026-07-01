# Demo Screenshot Capture Guide

## Capture Rules

Use synthetic demo data, consistent device/browser sizes, KariGO branding, and a clean
status bar/browser window. Mask phone numbers, emails, addresses beyond a safe area
summary, OTPs, tokens, credentials, payment references, bank details, and internal notes.

## Customer App

| File name | Why it matters | Must show | Mask/hide |
| --- | --- | --- | --- |
| `customer-01-splash-login.png` | Brand and entry | Logo, clear login action | Credentials |
| `customer-02-home.png` | Service proposition | Service cards and header | Personal data |
| `customer-03-vendor-list.png` | Marketplace discovery | Active vendors/search state | Private contacts |
| `customer-04-vendor-details.png` | Vendor/product choice | Name, category, products | Internal vendor data |
| `customer-05-cart.png` | Purchase intent | Items, quantities, subtotal | Customer details |
| `customer-06-checkout.png` | Order confirmation | Address summary and server totals | Full address/phone |
| `customer-07-promo.png` | Retention tool | `KARIGOFIRST` validation result | User identifiers |
| `customer-08-payment-success.png` | Payment milestone | Mock-payment success label | Reference/token |
| `customer-09-order-tracking.png` | Trust/visibility | Status timeline and OTP warning | Delivery OTP |
| `customer-10-support-ticket.png` | Recovery workflow | Category, status, visible messages | Internal notes/PII |
| `customer-11-notifications.png` | Activity feed | Recent operational updates | Entity IDs if sensitive |

## Rider App

| File name | Why it matters | Must show | Mask/hide |
| --- | --- | --- | --- |
| `rider-01-login.png` | Secure rider entry | KariGO branding/login | Credentials |
| `rider-02-dashboard.png` | Availability control | Online/offline state | Exact location |
| `rider-03-assigned-job.png` | Dispatch outcome | Job status and summary | Full customer contact |
| `rider-04-job-detail.png` | Fulfilment clarity | Pickup/delivery summaries | Sensitive address details |
| `rider-05-status-flow.png` | Controlled progression | Current and next action | Internal IDs |
| `rider-06-otp-completion.png` | Secure completion | OTP input and warning | Actual OTP |
| `rider-07-earnings.png` | Rider transparency | Total/pending/paid | Bank details |
| `rider-08-notifications.png` | Job/activity awareness | Recent rider updates | Device tokens |

## Vendor Dashboard

| File name | Why it matters | Must show | Mask/hide |
| --- | --- | --- | --- |
| `vendor-01-login.png` | Vendor access | Branded login | Credentials |
| `vendor-02-dashboard.png` | Operational summary | Order metrics/recent orders | Private financial details |
| `vendor-03-new-orders.png` | Demand visibility | Paid/new orders | Customer PII |
| `vendor-04-order-detail.png` | Fulfilment context | Items, status, safe address summary | Full customer contact |
| `vendor-05-order-actions.png` | Workflow control | Accept/preparing/ready actions | Internal IDs |
| `vendor-06-products.png` | Catalogue foundation | Products/availability or TODO state | Internal records |
| `vendor-07-settlements.png` | Finance visibility | Safe settlement status or documented placeholder | Bank details |

## Admin Portal

| File name | Why it matters | Must show | Mask/hide |
| --- | --- | --- | --- |
| `admin-01-login.png` | Controlled access | Branded admin login | Credentials |
| `admin-02-dashboard.png` | Management visibility | Core metrics | User PII |
| `admin-03-live-orders.png` | Operations queue | Status/filter table | Full addresses/phones |
| `admin-04-dispatch.png` | Dispatch control | Ready orders and riders | Exact rider location |
| `admin-05-rider-assignment.png` | Action evidence | Assignment confirmation | Private rider details |
| `admin-06-support.png` | Case management | Ticket status/priority/messages | Internal notes in public deck |
| `admin-07-promotions.png` | Growth controls | Promo status/limits | Admin IDs |
| `admin-08-reports.png` | Performance review | Operations/finance metrics | Raw personal data |
| `admin-09-settlements.png` | Financial oversight | Vendor/rider payout statuses | Bank/account data |

Record capture date, build/environment, reviewer, and approval status for each image.
