# Production Secrets Handling Policy

## Policy

- Never commit real credentials, `.env` files, tokens, passwords, private keys, or customer data to Git.
- Use separate development, staging, and production credentials and databases.
- Store deployment secrets only in the approved hosting platform or managed secret manager.
- Grant provider-dashboard access by named account with MFA and least privilege.
- Limit production secret access to accountable Engineering/DevOps/Security owners.

## Secret Classes

- Provider secrets: payment, SMS, email, WhatsApp, push, and webhook signing credentials.
- Platform secrets: JWT secret, database URL/password, internal webhook tokens, storage credentials.
- Seed/provisioning secrets: initial admin password; disable production seed reuse and rotate immediately.

## Rotation And Revocation

1. Record owner, purpose, environment, creation date, and expected rotation date.
2. Rotate high-risk/provider secrets at least every 90 days or provider-recommended interval.
3. Support overlap during planned rotation where the provider permits it.
4. Revoke immediately after suspected exposure, staff departure, or provider compromise.
5. Rotate dependent credentials, inspect audit/provider logs, and document the incident.

## Handling Rules

- Webhook secrets must be provider-specific and verified against the raw request body.
- JWT secrets must be long, randomly generated, environment-specific, and rotated with a session-impact plan.
- Database credentials must use encrypted connections, restricted networks, least privilege, and backup credentials separated from application credentials.
- Never log secrets, OTPs, authorization headers, full device tokens, or private provider payloads.
- CI/CD must reference secret names, never inline values.
- Production access must be auditable and reviewed quarterly.

## Compromise Response

Disable or rotate the credential, block affected integration traffic if needed, notify
Security/Operations, inspect logs and transactions, validate data integrity, inform the
provider, and complete the incident-response template.
