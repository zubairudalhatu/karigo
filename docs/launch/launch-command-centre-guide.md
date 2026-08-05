# Production Launch Command Centre Guide

Open Admin Portal > Production Launch.

## Command Centre

Review Kano and Abuja separately. Confirm stage per service, readiness percentage, Ride supply/demand, active orders/services, support totals, incidents and last successful transaction. A healthy API badge is not a launch approval.

## Configuration change

1. Select the city/service card.
2. Set stage, enabled state and capacity values.
3. Enter a specific reason and confirm.
4. For `CITY_WIDE` or `PAUSED`, complete the second confirmation.
5. Verify the resulting entry in Configuration History.

Do not put credentials, personal data or private contact details in reasons/notes.

## Operating hours JSON

Use timezone `Africa/Lagos`. Supported shape:

```json
{
  "weekly": {
    "mon": { "open": "08:00", "close": "20:00" },
    "sun": { "closed": true }
  },
  "holidayOverrides": {
    "2026-10-01": { "closed": true }
  }
}
```

Missing hours mean no schedule restriction; an explicit closed day blocks new activity. Existing work continues.

## Cohorts

Create the cohort in `DRAFT`, set a maximum, add active Customer UUIDs only, then activate it. Pause rather than delete a cohort. Do not import phone/email lists into the repository.

## Monitoring ownership

| Signal | Warning | Critical | Owner |
|---|---:|---:|---|
| API 5xx rate | 1% / 5 min | 5% / 5 min | Engineering |
| Login/refresh failures | 3% / 15 min | 10% / 15 min | Engineering |
| Unassigned requests | 50% of configured max | configured max | Dispatch |
| GPS stale Captains | 20% online | 40% online | Captain Operations |
| Payment exceptions | 1 unresolved | 3 unresolved | Finance |
| Urgent support cases | 1 | 3 | Support lead |
| Open SEV1 | n/a | any | Incident commander |

Configure external alerts in the approved monitoring provider using these thresholds and named owners. Never place credentials in repository configuration.

\n