# Legal URL verification

Checked before the Task 208B website deployment:

| URL | HTTP status | Result |
| --- | ---: | --- |
| `https://www.karigo.com.ng/privacy` | 200 | Live |
| `https://www.karigo.com.ng/terms` | 200 | Live |
| `https://www.karigo.com.ng/contact` | 200 | Live |
| `https://www.karigo.com.ng/account-deletion` | 404 before deployment | Implemented locally; website redeploy required |

The local production build includes `/account-deletion` and the authenticated `/app` deletion request control. Recheck the public URL for HTTP 200 after Vercel deployment and before completing Play App Content.
