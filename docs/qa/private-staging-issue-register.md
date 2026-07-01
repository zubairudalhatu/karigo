# Private Staging Issue Register

Severity: `Critical`, `High`, `Medium`, `Low`.

| Issue ID | Severity | Area | Description | Reproduction steps | Expected result | Actual result | Owner | Status | Target fix date | Launch effect | Evidence reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISS-001 | Critical | Staging deployment | Private staging environment is not provisioned or accessible from this workspace | Attempt to run Task 38 staging simulation without staging URLs, database, secret manager, or test accounts | Staging URLs/accounts available and simulation executable | Simulation cannot be executed | Engineering/DevOps | Open | TBD | Blocks private staging simulation and controlled soft launch decision | EV-STG-001 |
| ISS-002 | Critical | Demo accounts | Private staging demo account credentials are not provisioned through secure handover | Attempt to execute customer/vendor/admin/rider flows | Safe demo personas available without committing credentials | No staging personas available | Technical Owner/QA | Open | TBD | Blocks primary and negative simulations | EV-STG-002 |
| ISS-003 | High | Evidence | External access-controlled evidence storage location is not identified | Attempt to attach screenshots/logs safely | Masked evidence can be referenced without storing sensitive data in Git | Evidence location pending | QA/Management | Open | TBD | Blocks formal sign-off package | EV-STG-003 |

## Issue Handling Rules

- Critical issues block controlled soft launch until fixed and retested.
- High issues require owner approval before management demo or pilot sign-off.
- Do not close an issue without an evidence reference.
