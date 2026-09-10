import assert from 'node:assert/strict'
import fs from 'node:fs'
const read=(path:string)=>fs.readFileSync(path,'utf8')
const form=read('components/auth/setup-account-form.tsx'), page=read('app/setup-account/page.tsx'), admin=read('components/staff/staff-management-table.tsx')
for(const copy of ['Create your account','Account email','Confirm password','Sign in to continue','Check your email','Resend verification email','Resend in']) assert.match(form,new RegExp(copy))
assert.doesNotMatch(form,/name="(?:email|role|branch|organization)"/)
assert.match(form,/autoComplete="new-password"/)
for(const copy of ['Your account is ready','This invitation has expired','A newer invitation was sent',"This invitation isn't valid",'Account activation unavailable']) assert.match(page,new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
for(const copy of ['Invitation pending','Awaiting email verification','Invitation expired','Invitation revoked','Send new invitation']) assert.match(admin,new RegExp(copy))
assert.doesNotMatch(admin,/Send password reset/)
console.log('Staff invitation UI contract checks passed')
