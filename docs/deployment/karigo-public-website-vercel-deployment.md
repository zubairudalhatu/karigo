# KariGO Public Website Vercel Deployment

This guide prepares the public KariGO website for `https://www.karigo.com.ng`.

## Project

- App location: `apps/website`
- Framework: Next.js
- Preferred public domain: `https://www.karigo.com.ng`
- Backend API base URL for staging: `https://karigo-8htn.onrender.com/api/v1`

## Vercel Project Setup

1. Create or select the KariGO public website project on Vercel.
2. Connect the GitHub repository.
3. Set the root directory to:

   ```text
   apps/website
   ```

4. Use the default Next.js build settings unless Vercel detects different values.
5. Add environment variables:

   ```text
   NEXT_PUBLIC_API_BASE_URL=https://karigo-8htn.onrender.com/api/v1
   NEXT_PUBLIC_SITE_URL=https://www.karigo.com.ng
   ```

6. Deploy from the `main` branch.

## Build Commands

If manually configured:

```text
npm install
npm run build --workspace @karigo/website
```

Vercel may run the app build from `apps/website` directly. In that case:

```text
npm run build
```

## Backend CORS Reminder

The public vendor application form calls:

```text
POST /api/v1/vendor-applications
```

Before public website testing, ensure the backend deployment allows the website origin in `CORS_ORIGINS`, including:

```text
https://www.karigo.com.ng
https://karigo.com.ng
```

Do not add secrets to the repository.

## Verification

- Homepage loads.
- Services page clearly marks live vs preparing-launch services.
- Vendor application page submits to the configured API.
- Contact details show `meetup@karigo.com.ng`, `+234 805 709 2686`, and Kano, Nigeria.
- Privacy and Terms pages are visible and marked as draft/readiness pages.
