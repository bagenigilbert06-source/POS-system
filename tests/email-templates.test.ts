import assert from 'node:assert/strict'
import { staffInvitationEmail } from '../lib/email/templates/staff-invitation'

const email = staffInvitationEmail({ employeeName: '<John>', organizationName: 'Acme & Co', branchName: 'Main', role: 'Cashier', inviterName: 'Jordan', setupUrl: 'https://example.test/setup?token=secure' })
assert.match(email.subject, /Acme & Co/)
assert.match(email.text, /invitation expires/)
assert.match(email.html, /&lt;John&gt;/, 'dynamic HTML must be escaped')
assert.doesNotMatch(email.html, /<John>/, 'unescaped employee content must not enter HTML')
assert.match(email.html, /Set up your account/)
assert.match(email.html, /EMPLOYEE INVITATION/)
assert.doesNotMatch(email.html, /temporary password/i)
console.log('Transactional email template test passed')
