# Staff invitation lifecycle

`PENDING` is a staff setup link that has not created or claimed an account.
`AWAITING_EMAIL_VERIFICATION` has a linked Better Auth user but still has no
application membership or active employee access. `ACCEPTED` is terminal and
is written atomically with employee activation and organization/branch
memberships. `EXPIRED`, `REVOKED`, and `SUPERSEDED` are terminal.

Allowed transitions are `PENDING → AWAITING_EMAIL_VERIFICATION`, `PENDING →
ACCEPTED` for an already verified existing account, and either pending state →
`EXPIRED`, `REVOKED`, or `SUPERSEDED`. Only `AWAITING_EMAIL_VERIFICATION →
ACCEPTED` is used for a newly created account. A resend of the staff invite
supersedes the old invite; a resend of Better Auth email verification does not.
