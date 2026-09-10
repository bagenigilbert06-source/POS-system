import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (file: string) => readFileSync(join(root, file), 'utf8')
const service = read('lib/services/staff-invitation-service.ts')
const creation = read('app/actions/staff-actions.ts')
const authConfig = read('lib/auth.ts')
const mailer = read('lib/email/staff-invitation.ts')

// These contract checks deliberately protect the security boundaries that do
// not need a live Better Auth/isolated PostgreSQL fixture to exercise.
assert.match(creation, /const staffUserId = existingUser\?\.id \?\? null/)
assert.match(creation, /status = 'invitation_pending'/)
assert.doesNotMatch(creation, /auth\.api\.signUpEmail/)
assert.match(service, /AWAITING_EMAIL_VERIFICATION/)
assert.match(service, /email\.toLowerCase\(\) !== invite\.email\.toLowerCase\(\)/)
assert.match(service, /eq\(staffInvitation\.status, 'AWAITING_EMAIL_VERIFICATION'\)/)
assert.match(service, /eq\(staffInvitation\.userId, userId\)/)
assert.match(service, /onConflictDoNothing\(\)/)
assert.match(authConfig, /requireEmailVerification: true/)
assert.match(authConfig, /autoSignInAfterVerification: true/)
assert.match(authConfig, /nextCookies\(\)/)
assert.match(mailer, /innerJoin\(staffInvitation, eq\(staffInvitation\.employeeId, employee\.id\)\)/)
assert.doesNotMatch(mailer, /innerJoin\(branchMembership/)

console.log('staff invitation lifecycle contract checks passed')
