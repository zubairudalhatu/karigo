# Production EAS environment audit

Checked through authenticated EAS CLI without printing values.

| Variable name | Customer | Captain | Partner |
| --- | --- | --- | --- |
| `APP_VARIANT` | Present | Present | Present |
| `EXPO_PUBLIC_API_BASE_URL` | Present | Present | Present |
| `EXPO_PUBLIC_RIDES_SERVICE_ENABLED` | Present | Present | Not applicable |
| `EXPO_PUBLIC_RIDES_PRODUCTION_ENABLED` | Present | Present | Not applicable |
| `EXPO_PUBLIC_TAXI_SERVICE_ENABLED` | Present for compatibility | Present for compatibility | Not applicable |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Present | Present | Not applicable |

Resolved local production configuration confirms `APP_VARIANT=production`, production packages, channels, version/runtime 1.0.0 and API `https://karigo-8htn.onrender.com/api/v1`. The build process must still fail closed if EAS no longer supplies a required native Maps key.

No variable value, credential or placeholder key is stored in this record.
