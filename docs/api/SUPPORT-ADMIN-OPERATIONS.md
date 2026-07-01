# KariGO Support and Admin Operations

Customers can create support tickets, optionally link their own orders, view only their tickets, and add customer-visible messages. Internal admin notes are never returned through customer support routes.

Support admins (`SUPER_ADMIN`, `OPERATIONS_ADMIN`, or `SUPPORT_AGENT`) can list/filter tickets, inspect linked order/payment/vendor/rider context, assign tickets, update valid statuses, and add visible messages or internal notes.

## Ticket Status Flow

```text
OPEN -> IN_REVIEW
IN_REVIEW -> WAITING_FOR_CUSTOMER | WAITING_FOR_VENDOR | WAITING_FOR_RIDER | RESOLVED
WAITING_* -> IN_REVIEW | RESOLVED
RESOLVED -> CLOSED | IN_REVIEW
CLOSED -> IN_REVIEW
```

A customer reply while `WAITING_FOR_CUSTOMER` returns the ticket to `IN_REVIEW`. Closed tickets reject messages until an admin reopens them.

Refund and payment tickets provide review context only. Refund approval remains controlled by `/api/v1/admin/payments/:paymentId/approve-refund`.

## Admin Operations

Admin operations routes expose dashboard counts, order lists/details, audited order notes, and safe user/vendor/rider operational listings. Admin actions for ticket assignment, ticket status changes, ticket messages, order notes, refund approval, and rider assignment/reassignment create `AdminAuditLog` records.
