# Soft Launch Escalation Matrix

| Level | Issue types | First responder | Escalation owner | Target response | Required documentation | Closure requirement |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Complaint, clarification, basic delivery update, minor app issue | Support Officer | Support Lead | 15 minutes | Ticket/order reference and customer-visible update | Customer informed and ticket updated |
| 2 | Rider/vendor delay, failed delivery, wrong address, reassignment, vendor rejection | Dispatch Officer | Operations Lead | 10 minutes | Order timeline, contacts/actions, reason codes | Delivery/reassignment/closure decision recorded |
| 3 | Refund, duplicate payment, settlement, rider earning issue | Finance/Admin | Finance Lead | 30 minutes | Payment/order/audit references and approval evidence | Reconciled decision and customer/vendor/rider update |
| 4 | Crash, API/login/payment verification/dashboard failure | Technical On-call | Technical Lead | Critical: 10 minutes; other: 30 minutes | Incident log, timestamps, affected users/orders, logs without secrets | Fix/rollback, verification, incident notes |
| 5 | Safety/major customer incident, repeated failure, critical downtime, public complaint | Operations/Technical Lead | Management Lead | Immediate | Full incident record and communications approval | Management closure and lessons/actions assigned |

Unresolved issues must move upward before the response target expires. Never expose
credentials, OTPs, or unnecessary personal data in escalation records.
