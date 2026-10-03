# Ads upgrade dependency gate

## Current audit

The owner-authorized `npm audit --json` was run once on 3 October 2026 with the repository's root `package-lock.json`. The JSON evidence is retained outside source at `%TEMP%\karigo-ads-audit-20261003.json`. No fix, install, upgrade or lockfile write was performed.

- Dependency nodes audited: 1,386
- Affected nodes reported by npm: 79 (69 high, 10 moderate)
- Distinct advisories: 11 (7 high, 4 moderate)
- Critical: 0; high: 69; moderate: 10; low: 0

`Affected nodes` includes parent packages whose severity is inherited from a transitive advisory. The table below reconciles every distinct HIGH and MODERATE advisory and its affected parent chain.

## Advisory reconciliation

| Severity / advisory | Package and vulnerable range | Direct/path/workspaces | Runtime reachability | Changed-path reachability (upload / auth-OTP-session / CTA-redirect / backend request) | Preconditions | Fix / breaking impact | Treatment |
|---|---|---|---|---|---|---|---|
| HIGH GHSA-6g55-p6wh-862q | `postcss` <=8.5.11 | Transitive through Next and Expo/Metro configuration; website, admin, vendor, mobile build pipelines | NO: CSS build processing only | NO / NO / NO / NO | Attacker controls build-time CSS containing a malicious `sourceMappingURL`, with a local target file readable by the build process | Fixed 8.5.12; npm resolves affected parents through major framework/toolchain updates | **NON-BLOCKING**; schedule framework/toolchain upgrade |
| HIGH GHSA-r28c-9q8g-f849 | `postcss` <=8.5.17 | Same PostCSS parent chains and workspaces | NO | NO / NO / NO / NO | Attacker-controlled previous source-map comment is processed during a trusted build | Fixed 8.5.18; parent remediation is framework/toolchain work and may be breaking | **NON-BLOCKING**; schedule upgrade |
| HIGH GHSA-ggr8-5vv4-36mx | `deepmerge-ts` <8.0.0 | Transitive `prisma` -> `@prisma/config` -> `deepmerge-ts`; backend migration/generation CLI | NO: `@prisma/client` serves requests; vulnerable merge code is in Prisma CLI/config | NO / NO / NO / NO | A recursive attacker-controlled object reaches Prisma CLI configuration merging | Fixed 8.0.0; requires reviewed Prisma dependency movement/override | **NON-BLOCKING**; update with Prisma toolchain |
| HIGH GHSA-5p2g-fcmc-qvqq | `image-size` >=1.2.0 <=2.0.2 | Transitive React Native/Expo Metro transformer; Customer, Captain, Partner mobile builds | NO: Metro/build-time parser | NO: Ads upload uses the repository's bounded JPEG/PNG signature parser, not `image-size` / NO / NO / NO | Malicious JXL/HEIF is parsed by Metro during a developer/build workflow | Fixed >2.0.2; npm parent fix is a React Native/Expo toolchain upgrade and can be breaking | **NON-BLOCKING**; update mobile toolchain |
| HIGH GHSA-w3rx-r6r6-pgpr | `image-size` >=0.6.3 <=2.0.2 | Same Metro chain and mobile workspaces | NO | NO / NO / NO / NO | Malicious ICNS reaches Metro's build-time image inspection | Fixed >2.0.2; reviewed React Native/Expo toolchain change required | **NON-BLOCKING**; update mobile toolchain |
| HIGH GHSA-86w9-cpqp-85rv | `node-forge` <=1.4.0 | Transitive Expo CLI/code-signing tooling; mobile workspaces | NO: Expo CLI/build signing only | NO / NO / NO / NO | A crafted RSA signature is verified through the affected Forge routine in tooling | Fixed >1.4.0; npm points through an Expo toolchain upgrade | **NON-BLOCKING**; update Expo toolchain |
| HIGH GHSA-vfj7-8cjw-p6xm | `braces` <=3.0.3 | Transitive Jest -> micromatch -> braces; test/dev tooling across workspaces | NO | NO / NO / NO / NO | Deeply nested attacker-controlled glob is evaluated by the test runner/tooling | Fixed >3.0.3; npm parent fix points to Jest 30 and is breaking | **NON-BLOCKING**; update test toolchain |
| MODERATE GHSA-qx2v-qp2m-jg93 | `postcss` <8.5.10 | Transitive Next/Expo build chain; web and mobile build workspaces | NO | NO / NO / NO / NO | Attacker-controlled CSS is stringified into a style context during a trusted build | Fixed 8.5.10; parent framework update may be breaking | **NON-BLOCKING** |
| MODERATE GHSA-w5hq-g745-h8pq | `uuid` <11.1.1 | Transitive Expo config plugins -> `xcode` -> `uuid`; mobile native-build tooling | NO | NO / NO / NO / NO | Tooling invokes UUID v3/v5/v6 with an undersized attacker-controlled output buffer | Fixed 11.1.1; parent Expo/xcode update may be breaking | **NON-BLOCKING** |
| MODERATE GHSA-fxqj-rqcc-2cmp | `postcss` <=8.5.22 | Transitive Next/Expo build chain; web and mobile build workspaces | NO | NO / NO / NO / NO | Attacker-controlled source map is processed with `from` unset during a build | Fixed 8.5.23; parent framework update may be breaking | **NON-BLOCKING** |
| MODERATE GHSA-r3ph-w7gj-g6xm | `js-yaml` >=5.0.0 <=5.4.0 | Transitive `@nestjs/swagger` -> nested `js-yaml`; backend schema/documentation tooling | NO practical production request path identified | NO / NO / NO / NO | Attacker controls YAML with empty recursive merge sources and Swagger tooling parses it | Fixed >5.4.0; npm points to `@nestjs/swagger` 12 and is breaking | **NON-BLOCKING**; update Swagger toolchain |

The affected parent nodes include Expo, React Native, Metro, Jest, Prisma CLI, Next, Swagger, and their helpers. Those inherited nodes do not represent additional advisories beyond the 11 reconciled above. Source/import inspection found no Fastify server, cookie/JWT, OTP, URL parser, redirect, SSRF/request client or Prisma runtime advisory in the current result.

## Gate decision

No HIGH advisory is both reachable from the production runtime and relevant to upload, authentication, OTP/session, redirect, CTA or request handling with a practical exploit path. All current HIGH and MODERATE advisories are **NON-BLOCKING** for this release. They remain recorded for controlled framework/toolchain maintenance. The package lock remains unchanged.
