# Authoritative Partner order matrix (P2)

Reviewed before mobile implementation against VendorOrderStatusService, VendorDashboardOrdersService/controller, rejection DTO, vendor web app/orders/[id] and src/api/orders.api.ts, shared OrderStatus, Prisma Order/OrderItem/OrderStatusHistory and Partner mobile API/screens.

| CURRENT_STATE | ALLOWED_PARTNER_ACTION | TARGET_STATE | BACKEND_ENDPOINT/SERVICE | AUTHORIZATION | SIDE_EFFECTS |
|---|---|---|---|---|---|
| PAID | accept | VENDOR_ACCEPTED | POST /vendor-dashboard/orders/:id/accept; existing transition service | Active, verified account; ACTIVE owned Vendor; normal JWT; not onboarding or signed-out token | Existing OrderStatusHistory actor/role/time; accepted event and existing notification/push pipeline |
| VENDOR_CONFIRMING | accept | VENDOR_ACCEPTED | same | same | same |
| PAID | reject | VENDOR_REJECTED | POST /vendor-dashboard/orders/:id/reject | same | Structured reason + optional validated business note; history; successful Order/Payment statuses become REFUND_PENDING for review, not refund execution; rejection event |
| VENDOR_CONFIRMING | reject | VENDOR_REJECTED | same | same | same |
| VENDOR_ACCEPTED | preparing | PREPARING | POST /vendor-dashboard/orders/:id/preparing | same | History and preparing event |
| PREPARING | ready | READY_FOR_PICKUP | POST /vendor-dashboard/orders/:id/ready | same | History and ready-for-pickup event; does not assign a courier, hand over or complete |

No other Partner transitions exist. READY_FOR_PICKUP and later courier states have no merchant mutation. Completed/cancelled/rejected/refunded/failed history is view-only. AWAITING_PAYMENT/DRAFT/REFUND_REQUESTED have no merchant action. Items have quantity, prices and specialInstruction; there is no persisted selected-options field or merchant fulfilment-mode selector to invent.

Reasons: ITEM_UNAVAILABLE, VENDOR_CLOSED, PRICE_ERROR, TOO_BUSY, OUT_OF_DELIVERY_WINDOW, OTHER. Optional details retain the existing 500-character limit and exclude control characters/obvious credentials or diagnostic dumps.

P2 backend gaps addressed locally: active/approved owner enforcement; signed-out access-token rejection on merchant order routes; optional paired expectedStatus/expectedUpdatedAt for web compatibility (mobile always supplies both); atomic state/payment/timestamp compare-and-set + transactional history/refund-review flags; explicit safe merchant DTO instead of spreading the raw Order; durable P1 Partner push outbox entry after a winning transition. No new state machine, financial operation or mobile-only mutation endpoint.

Concurrency: row approval locks plus a conditional Order update claim. A mismatch returns 409 and writes neither history nor refund-review flags. Repeating an action is a safe conflict, not a duplicate transition. Notification failure after commit does not report an unsuccessful business transition. The existing web API can omit a client version but still uses the same atomic server precondition.

Realtime inspection found only the Taxi/ride gateway and participant rooms, not an authorized merchant order channel. P2 uses bounded foreground/focused-screen refresh (20-second interval, one read in flight, finite request timeout), push invalidation and pull-to-refresh. No new socket or background polling is introduced. The list API has no pagination contract; P2 does not invent pagination metadata.

No Production, Apple, native build or OTA action is authorized here.
