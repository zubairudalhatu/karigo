# KariGO Domain Connection Guide

Preferred public domain:

```text
https://www.karigo.com.ng
```

Do not guess DNS records. Vercel will show the exact CNAME and A records to add.

## Steps

1. Create or select the KariGO website project on Vercel.
2. Set the project root directory to the website app if needed:

   ```text
   apps/website
   ```

3. Add environment variables:

   ```text
   NEXT_PUBLIC_API_BASE_URL=https://karigo-8htn.onrender.com/api/v1
   NEXT_PUBLIC_SITE_URL=https://www.karigo.com.ng
   ```

4. Deploy from `main`.
5. In Vercel, add domains:

   ```text
   karigo.com.ng
   www.karigo.com.ng
   ```

6. Open the domain registrar DNS settings.
7. Add the exact DNS records shown by Vercel.
8. Wait for DNS propagation.
9. Wait for Vercel SSL certificate issuance.
10. Test:

   ```text
   https://www.karigo.com.ng
   https://karigo.com.ng
   ```

11. Ensure one domain redirects cleanly to the preferred domain:

   ```text
   https://www.karigo.com.ng
   ```

## Notes

- Use Vercel's displayed DNS values exactly.
- Do not commit domain registrar credentials.
- Do not commit Vercel tokens.
- If vendor application submission fails in browser, confirm backend `CORS_ORIGINS` includes the website domains.
