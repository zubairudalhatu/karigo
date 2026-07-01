# Known Issues

## Critical Launch Blockers

- Real payment gateway, bank transfer, SMS, email, WhatsApp, and push providers are not connected. The platform is suitable only for controlled mock-provider soft-launch review.
- Mobile apps still require physical-device/manual UI walkthroughs against a LAN-accessible backend before pilot release.
- Browser JWT storage in vendor/admin dashboards should be replaced with a production-grade secure cookie or BFF session design before public deployment.

## Important But Not Blocking For Internal Review

- Vendor product management, vendor settlement view, vendor support, and rider support backend routes are not implemented.
- User/vendor/rider approval and suspension management endpoints are not implemented.
- Report preparation and delivery durations are placeholders because milestone timestamps are not persisted separately.
- Docker is not installed on the current Windows machine; local PostgreSQL 17 is used instead.
- Prisma warns that `package.json#prisma` seed configuration will be removed in Prisma 7.

## Future Improvements

- Pagination and richer filters across administrative tables.
- Embedded maps and live/background rider GPS.
- Advanced loyalty, wallet, campaign automation, and analytical charts.
- Production observability, rate-limit tuning, backup/restore rehearsal, and external security review.
