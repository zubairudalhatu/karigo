# TASK 209B-S1-H11.2E — Bounded production dependency security remediation

Date: 2026-09-27

Branch: `codex/dependency-security-remediation`

Baseline: `089ab2330e1a6a3efacc3e9d97940b333fb71623`

## Outcome

The compatible patch/minor remediation reduced the full npm audit from 40 findings to 21 and the production audit from 39 findings to 21. Critical and low findings are now zero. No major framework migration, forced audit fix, EAS build, deployment, or push was performed.

| Audit | Before | After | Change |
| --- | ---: | ---: | ---: |
| Full | 40: 17 high, 22 moderate, 1 low | 21: 5 high, 16 moderate | -19 total; -12 high |
| `--omit=dev` | 39: 16 high, 22 moderate, 1 low | 21: 5 high, 16 moderate | -18 total; -11 high |

No remaining high advisory was found on a normal production request/runtime path. The production audit still lists build and CLI packages because npm's workspace dependency graph includes those packages in its omit-dev result; the package paths and application imports were reviewed separately below.

## Changes applied

- Updated `@nestjs/platform-express` within Nest 11 to `11.2.6`, which resolves `multer` to `2.4.0`.
- Updated `@nestjs/swagger` within major 11 to `11.4.7`, which resolves its `js-yaml` dependency to `5.3.0`.
- Refreshed compatible Nest 11 lock resolutions together. This produces one deduplicated `@nestjs/common@11.2.6` / `@nestjs/core@11.2.6` runtime and avoids cross-copy exception-class behavior.
- Added `sharp@0.35.4` to Admin, Partner Workspace, and Website. Next `15.5.26` explicitly accepts `^0.34.3 || ^0.35.4`, so this removes the vulnerable optional Sharp resolution without changing Next major or minor.
- Refreshed compatible transitive versions within existing parent ranges, including `@xmldom/xmldom`, `body-parser`, `brace-expansion`, `browserslist`, `baseline-browser-mapping`, `fast-uri`, `form-data`, `js-yaml`, `nanoid`, `qs`, `shell-quote`, `undici`, and React Navigation dependencies.
- Updated the Captain location regression check to recognize the current, stricter `hasAcceptedActiveWork(workState)` background-location guard. Application behavior was not changed.

No `npm audit fix`, `npm audit fix --force`, dependency override for an incompatible major, Prisma major upgrade, Expo/React Native major upgrade, or Next 16 upgrade was used.

## Residual advisory classification

### High: Prisma CLI/config chain

Packages: `prisma@6.19.3` -> `@prisma/config@6.19.3` -> `deepmerge-ts@7.1.5`.

Classification: build/development tooling. `prisma` is a backend dev dependency used by schema validation, generation, migration, seed, and Studio scripts. Runtime application code uses `@prisma/client`; it does not import `prisma`, `@prisma/config`, or `deepmerge-ts`. The published Prisma 6 line still pins the affected `deepmerge-ts` version. Replacing it requires an incompatible dependency override or a Prisma major upgrade, both outside this task's boundary.

### High: React Native Metro image inspection

Package: `image-size@1.2.1` through `react-native@0.79.6` -> `@react-native/community-cli-plugin` -> `metro`.

Classification: mobile bundler/CLI tooling. No KariGO source file imports `image-size`; it is used in the Metro toolchain rather than the installed application runtime. The fixed `image-size` line requires a parent-toolchain change outside the allowed React Native/Expo boundary.

### High: PostCSS build pipelines

Packages: `postcss@8.4.31` under Next `15.5.26`, and `postcss@8.4.49` under Expo Metro.

Classification: web/mobile build tooling. KariGO does not directly import PostCSS or process user-supplied CSS/source maps. Next `15.5.26` pins `8.4.31`; npm proposes Next 16 for the audited fix. Expo's parent chain similarly requires a major SDK change. Those migrations are outside this bounded task.

### Moderate findings

The remaining moderate entries are the Expo 53 configuration/prebuild chain, `uuid` through the iOS `xcode` project tool, and Next through the PostCSS advisory. npm's proposed remediations cross to Expo 57 or Next 16. They remain recorded for planned framework-upgrade work.

## Validation evidence

All commands used repository Node `v22.23.2` and npm `10.9.8`.

- `npm ci`: passed from the final lockfile; 1,271 packages installed and 1,282 audited.
- `npm run db:validate`: passed; Prisma schema is valid.
- `npm run db:generate`: passed; Prisma Client `6.19.3` generated.
- `npm run typecheck`: passed for all workspaces.
- `npm run audit:production-copy`: passed.
- Backend production build: passed, including Render build-entry and plain-Node runtime checks.
- Backend tests: 102 suites passed; 996 tests passed.
- Admin portal regression suite and production build: passed.
- Partner Workspace regression suite and production build: passed.
- Public website regression suite and production build: passed.
- Customer app regression suite: passed.
- Captain app regression, Play compliance regression, and location cockpit regression: passed.
- Partner app regression suite: passed.
- Expo Doctor: Customer 18/18, Captain 18/18, Partner 18/18.
- Final full audit: 0 critical, 5 high, 16 moderate, 0 low.
- Final production audit: 0 critical, 5 high, 16 moderate, 0 low.
- `git diff --check`: passed.

EAS cloud builds were deliberately not run.
