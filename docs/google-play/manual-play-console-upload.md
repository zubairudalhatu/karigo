# Manual Google Play Internal Testing upload

Use this path when no service-account key is configured for EAS Submit.

Repeat for each exact Play app record:

1. Open Play Console and select the app whose package exactly matches the AAB.
2. Confirm Play App Signing is enabled and the expected upload certificate is registered.
3. Open **Test and release > Testing > Internal testing**.
4. Create a new release and upload the AAB downloaded from its authenticated EAS build page.
5. Confirm package/versionCode: Customer `com.karigo.customer`/16; Captain `com.karigo.rider`/14; Partner `com.karigo.partner`/6.
6. Paste release notes from the app `store-listing.md`.
7. Review device compatibility, signing, target SDK, policy and native-code warnings. Stop on any blocking warning.
8. Add only the private Google/Workspace tester list and roll out to Internal testing.
9. Store the opt-in URL in the restricted launch record, not Git.
10. Install from Play on a clean device and run the acceptance matrix before Closed Testing.

Do not upload an APK, staging package, alternate-signing AAB or build from an older runtime. Do not promote to public Production in this task.
