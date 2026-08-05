# SME service controlled drill runbook

## Preconditions

- SME Services is owner-confirmed as `OPERATIONS_ONLY` for the city.
- The controlled Customer and controlled Service Provider or mixed Partner are enabled.
- At least one relevant service is active and the request lifecycle, support owner, and settlement review are ready.

## Success path

1. Create the SME drill record with city, Customer, group, Partner, and safe reference fields.
2. Customer selects an active service and submits the request.
3. Confirm the controlled provider can view and acknowledge the request.
4. Progress through the implemented lifecycle and verify Customer status updates.
5. Complete the service and review any implemented earning/settlement record.
6. Confirm the Admin audit trail and mark all drill steps.

## Failure cases

Exercise provider rejection, service unavailable, Customer cancellation, provider suspension, and service pause. New requests must be blocked while an active request stays manageable. Do not imply automatic dispatch, payment collection, payout automation, or medical booking.
