'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, count, desc, eq, ilike, isNotNull, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auditEvent, promotionRule, customer, businessSettings, organization } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email/client';
import { requirePermission } from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';
import { generateId } from '@/lib/utils';

const kindSchema = z.enum(['coupon', 'discount', 'bonus']);
const inputSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    code: z.string().trim().max(40).optional().default(''),
    description: z.string().trim().max(300).optional().default(''),
    kind: kindSchema,
    valueType: z.enum(['percentage', 'fixed']),
    value: z.number().positive().max(999999999),
    minimumSpend: z.number().nonnegative().max(999999999).default(0),
    maximumDiscount: z.number().positive().max(999999999).nullable().optional(),
    bonusValidityDays: z.number().int().refine((v) => [7,14,30,60,90].includes(v)).nullable().optional(),
    usageLimit: z.number().int().positive().max(1000000).nullable().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (value.kind === 'coupon' && !value.code)
      context.addIssue({
        code: 'custom',
        path: ['code'],
        message: 'Coupon code is required',
      });
    if (value.valueType === 'percentage' && value.value > 100)
      context.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Percentage cannot exceed 100',
      });
    if (value.endsAt <= value.startsAt)
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'End date must be after the start date',
      });
  });

export type PromotionInput = z.infer<typeof inputSchema>;

// Keep all promotional emails compact and consistent with the dashboard typography.
function compactEmailMarkup(markup: string) {
  return markup
    .replaceAll("font-family:Manrope,Inter,Arial,sans-serif", "font-family:'Manrope',Inter,Arial,sans-serif")
    .replaceAll('font-size:29px', 'font-size:24px')
    .replaceAll('font-size:27px', 'font-size:23px')
    .replaceAll('font-size:25px', 'font-size:22px')
    .replaceAll('font-size:24px', 'font-size:22px')
    .replaceAll('font-size:21px', 'font-size:19px')
    .replaceAll('font-size:20px', 'font-size:18px')
    .replaceAll('font-size:15px', 'font-size:14px')
    .replaceAll('font-size:14px', 'font-size:13px');
}

export async function sendCouponEmail(couponId: string, customerId: string) {
  const authorization = await requirePermission(PermissionEnum.REWARDS_SETTINGS);
  const [coupon] = await db.select().from(promotionRule).where(and(eq(promotionRule.id, couponId), eq(promotionRule.organizationId, authorization.organizationId), eq(promotionRule.kind, 'coupon'))).limit(1);
  const [recipient] = await db.select().from(customer).where(and(eq(customer.id, customerId), eq(customer.orgId, authorization.organizationId))).limit(1);
  const now = new Date();
  if (!coupon || !coupon.isActive || coupon.startsAt > now || coupon.endsAt < now || (coupon.lifecycleStatus && coupon.lifecycleStatus !== 'ACTIVE')) throw new Error('Coupon is not active');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) throw new Error('This coupon has reached its usage limit');
  if (!recipient?.email) throw new Error('Customer has no email address');
  const [branding] = await db.select({ organizationName: organization.name, displayName: businessSettings.displayName, receiptBusinessName: businessSettings.receiptBusinessName, logoUrl: businessSettings.receiptLogoUrl }).from(organization).leftJoin(businessSettings, eq(businessSettings.organizationId, organization.id)).where(eq(organization.id, authorization.organizationId)).limit(1);
  const discount = coupon.valueType === 'percentage' ? `${coupon.value}% off` : `KES ${coupon.value} off`;
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
  const merchant = branding?.receiptBusinessName || branding?.displayName || branding?.organizationName || 'Your store';
  const safeMerchant = escapeHtml(merchant);
  const safeName = escapeHtml(recipient.name || 'there');
  const safeCouponName = escapeHtml(coupon.name);
  const safeCode = escapeHtml(coupon.code || 'COUPON');
  const safeDiscount = escapeHtml(discount);
  const minimumSpend = Number(coupon.minimumSpend).toLocaleString('en-KE');
  const validUntil = coupon.endsAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media only screen and (max-width:600px){.shell{width:100%!important}.pad{padding-left:20px!important;padding-right:20px!important}.hero{font-size:25px!important}.code{font-size:23px!important;letter-spacing:1px!important}}</style></head><body style="margin:0;background:#f7f7f7;color:#202124;font-family:'Manrope',Inter,Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Your welcome offer from ${safeMerchant}: ${safeDiscount} with code ${safeCode}.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7"><tr><td align="center" style="padding:28px 14px"><table class="shell" role="presentation" width="580" cellspacing="0" cellpadding="0" style="width:100%;max-width:580px;background:#fff;border:1px solid #e5e5e5;border-radius:14px;overflow:hidden"><tr><td class="pad" style="background:#fff;padding:22px 34px;border-top:4px solid #f45113;border-bottom:1px solid #eeeeee"><div style="font-size:15px;font-weight:800;letter-spacing:.02em;color:#f45113">${safeMerchant}</div></td></tr><tr><td class="pad" style="padding:32px 34px 18px"><div style="font-size:14px;color:#6b7280">Hi ${safeName},</div><h1 class="hero" style="margin:10px 0 10px;font-size:29px;line-height:1.2;letter-spacing:-.025em;color:#202124">A little welcome gift, just for you.</h1><p style="margin:0;max-width:470px;font-size:15px;line-height:1.7;color:#6b7280">Thanks for joining ${safeMerchant}. Enjoy ${safeDiscount} on your next eligible purchase.</p></td></tr><tr><td class="pad" style="padding:10px 34px 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff8f4;border:1px solid #f1d7cc;border-radius:12px"><tr><td align="center" style="padding:25px 18px"><div style="font-size:11px;font-weight:800;letter-spacing:.14em;color:#8a5b48">YOUR WELCOME CODE</div><div class="code" style="display:inline-block;margin:14px 0 12px;padding:11px 18px;background:#fff;border:1px dashed #f45113;border-radius:7px;font-size:27px;font-weight:800;letter-spacing:2px;color:#f45113">${safeCode}</div><div style="font-size:21px;font-weight:800;color:#202124;text-transform:uppercase">${safeDiscount}</div><table role="presentation" cellspacing="0" cellpadding="0" style="margin:14px auto 0"><tr><td style="padding:0 10px;font-size:12px;color:#6b7280">Minimum spend<br><strong style="color:#202124">KES ${minimumSpend}</strong></td><td style="border-left:1px solid #e6d8d2;padding:0 10px;font-size:12px;color:#6b7280">Valid until<br><strong style="color:#202124">${validUntil}</strong></td></tr></table></td></tr></table><p style="margin:18px 0 0;font-size:13px;line-height:1.65;color:#5f6368">Use this code at checkout. Terms and conditions apply.</p></td></tr><tr><td class="pad" style="border-top:1px solid #eeeeee;padding:17px 34px;font-size:11px;line-height:1.55;color:#8a8f98">You’re receiving this email because you registered as a customer of ${safeMerchant}.</td></tr></table></td></tr></table></body></html>`;
  const subject = `Welcome to ${merchant} — ${discount.replace(' off', ' Off')}`;
  const result = await sendEmail({ to: { email: recipient.email, name: recipient.name }, subject, text: `Welcome to ${merchant}. Thanks for joining us. Use ${coupon.code} at checkout for ${discount}. Minimum spend KES ${coupon.minimumSpend}. Valid until ${validUntil}. Terms and conditions apply.`, html: compactEmailMarkup(html) });
  await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'COUPON_EMAIL_SENT', metadata: { couponId, customerId } });
  return result;
}

/** Server-authoritative recipient search for coupon distribution. */
export async function searchCouponEligibleCustomers(input: { couponId: string; kind?: 'coupon' | 'discount' | 'bonus'; search?: string; page?: number; pageSize?: number }) {
  const authorization = await requirePermission(PermissionEnum.REWARDS_SETTINGS);
  const kind = input.kind ?? 'coupon';
  const [coupon] = await db.select().from(promotionRule).where(and(eq(promotionRule.id, input.couponId), eq(promotionRule.organizationId, authorization.organizationId), eq(promotionRule.kind, kind))).limit(1);
  const now = new Date();
  if (!coupon || !coupon.isActive || coupon.startsAt > now || coupon.endsAt < now || (coupon.lifecycleStatus && coupon.lifecycleStatus !== 'ACTIVE')) throw new Error('Coupon is not active');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { customers: [], total: 0, page: 1, pageSize: input.pageSize ?? 10, usageLimitReached: true };
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 20);
  const page = Math.max(input.page ?? 1, 1);
  const term = input.search?.trim();
  const conditions = [eq(customer.orgId, authorization.organizationId), isNotNull(customer.email)];
  if (term) conditions.push(or(ilike(customer.name, `%${term}%`), ilike(customer.email, `%${term}%`), ilike(customer.phone, `%${term}%`))!);
  const [totalRow] = await db.select({ value: count() }).from(customer).where(and(...conditions));
  const customers = await db.select({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }).from(customer).where(and(...conditions)).orderBy(desc(customer.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
  return { customers, total: Number(totalRow?.value ?? 0), page, pageSize, usageLimitReached: false };
}

export async function sendCouponEmailToAddress(couponId: string, email: string) {
  const authorization = await requirePermission(PermissionEnum.REWARDS_SETTINGS);
  const [recipient] = await db.select({ id: customer.id }).from(customer).where(and(eq(customer.email, email.trim().toLowerCase()), eq(customer.orgId, authorization.organizationId))).limit(1);
  if (!recipient) throw new Error('Registered customer with that email was not found');
  return sendCouponEmail(couponId, recipient.id);
}

export async function sendCouponToCustomers(input: { couponId: string; customerIds: string[] }) {
  const authorization = await requirePermission(PermissionEnum.REWARDS_SETTINGS);
  const ids = [...new Set(input.customerIds)].slice(0, 500);
  if (!ids.length) throw new Error('Select at least one customer');
  const [coupon] = await db.select().from(promotionRule).where(and(eq(promotionRule.id, input.couponId), eq(promotionRule.organizationId, authorization.organizationId), eq(promotionRule.kind, 'coupon'))).limit(1);
  const now = new Date();
  if (!coupon || !coupon.isActive || coupon.startsAt > now || coupon.endsAt < now || (coupon.lifecycleStatus && coupon.lifecycleStatus !== 'ACTIVE')) throw new Error('Coupon is not active');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) throw new Error('This coupon has reached its usage limit');
  const recipients = await db.select({ id: customer.id, name: customer.name, email: customer.email }).from(customer).where(and(eq(customer.orgId, authorization.organizationId), or(...ids.map((id) => eq(customer.id, id)))));
  const results: Array<{ id: string; name: string; sent: boolean; reason?: string }> = [];
  for (let index = 0; index < recipients.length; index += 10) {
    const batch = recipients.slice(index, index + 10);
    results.push(...await Promise.all(batch.map(async (recipient) => {
      if (!recipient.email) return { id: recipient.id, name: recipient.name, sent: false, reason: 'Invalid email' };
      try { await sendCouponEmail(coupon.id, recipient.id); return { id: recipient.id, name: recipient.name, sent: true }; }
      catch { return { id: recipient.id, name: recipient.name, sent: false, reason: 'Provider unavailable' }; }
    })));
  }
  const sent = results.filter((result) => result.sent).length;
  await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'COUPON_EMAIL_BATCH_SENT', metadata: { couponId: coupon.id, selectedCount: ids.length, sentCount: sent, failedCount: results.length - sent } });
  return { selected: ids.length, sent, failed: results.length - sent, failures: results.filter((result) => !result.sent).map(({ id, name, reason }) => ({ id, name, reason })) };
}

export async function sendDiscountCampaignToCustomers(input: { campaignId: string; customerIds: string[] }) {
  const authorization = await requirePermission(PermissionEnum.REWARDS_SETTINGS);
  const ids = [...new Set(input.customerIds)].slice(0, 500);
  if (!ids.length) throw new Error('Select at least one customer');
  const [campaign] = await db.select().from(promotionRule).where(and(eq(promotionRule.id, input.campaignId), eq(promotionRule.organizationId, authorization.organizationId), eq(promotionRule.kind, 'discount'))).limit(1);
  const now = new Date();
  if (!campaign || !campaign.isActive || campaign.startsAt > now || campaign.endsAt < now || (campaign.lifecycleStatus && campaign.lifecycleStatus !== 'ACTIVE')) throw new Error('Discount campaign is not active');
  if (campaign.usageLimit != null && campaign.usedCount >= campaign.usageLimit) throw new Error('This discount campaign has reached its usage limit');
  const [branding] = await db.select({ organizationName: organization.name, displayName: businessSettings.displayName, receiptBusinessName: businessSettings.receiptBusinessName, logoUrl: businessSettings.receiptLogoUrl }).from(organization).leftJoin(businessSettings, eq(businessSettings.organizationId, organization.id)).where(eq(organization.id, authorization.organizationId)).limit(1);
  const recipients = await db.select({ id: customer.id, name: customer.name, email: customer.email }).from(customer).where(and(eq(customer.orgId, authorization.organizationId), or(...ids.map((id) => eq(customer.id, id)))));
  const discount = campaign.valueType === 'percentage' ? `${campaign.value}% off` : `KES ${campaign.value} off`;
  const merchant = branding?.receiptBusinessName || branding?.displayName || branding?.organizationName || 'Your store';
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
  const results: Array<{ id: string; name: string; sent: boolean; reason?: string }> = [];
  for (let index = 0; index < recipients.length; index += 10) {
    results.push(...await Promise.all(recipients.slice(index, index + 10).map(async (recipient) => {
      if (!recipient.email) return { id: recipient.id, name: recipient.name, sent: false, reason: 'Invalid email' };
      const safeName = escapeHtml(recipient.name || 'there'); const safeMerchant = escapeHtml(merchant); const safeCampaign = escapeHtml(campaign.name); const safeDiscount = escapeHtml(discount); const logo = `<div style="font-size:15px;font-weight:800;letter-spacing:.03em;color:#f45113">${safeMerchant}</div>`;
      const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;color:#182230;font-family:Manrope,Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e3e8ee;border-radius:12px;overflow:hidden"><tr><td style="height:5px;background:#f45113;font-size:0">&nbsp;</td></tr><tr><td align="center" style="padding:26px 30px 8px">${logo}<h1 style="margin:12px 0 6px;font-size:24px;line-height:1.25;color:#182230">A special offer for you</h1><p style="margin:0;color:#68778b;font-size:14px;line-height:1.6">Hi ${safeName}, enjoy this automatic saving on your next eligible purchase.</p></td></tr><tr><td style="padding:20px 30px 26px"><div style="border:1px solid #f1d4c7;border-radius:10px;background:#fffaf7;padding:22px"><div style="font-size:13px;color:#68778b">${safeCampaign}</div><div style="margin:10px 0;font-size:24px;font-weight:800;color:#e0440b">${safeDiscount}</div><div style="font-size:13px;line-height:1.7;color:#68778b">Minimum spend: KES ${Number(campaign.minimumSpend).toLocaleString('en-KE')}<br>Maximum discount: KES ${Number(campaign.maximumDiscount ?? 0).toLocaleString('en-KE')}<br>Valid until: ${campaign.endsAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div><p style="margin:20px 0 0;text-align:center;color:#68778b;font-size:13px;line-height:1.6"><strong>No coupon code required.</strong><br>The discount is applied automatically at checkout when your purchase qualifies.</p></td></tr><tr><td style="border-top:1px solid #edf0f3;padding:16px 30px;color:#8a96a8;font-size:11px">You are receiving this because you are a registered customer of ${safeMerchant}.</td></tr></table></td></tr></table></body></html>`;
      try { await sendEmail({ to: { email: recipient.email, name: recipient.name }, subject: `Save ${discount} at ${merchant}`, text: `Enjoy ${discount}. Minimum spend KES ${campaign.minimumSpend}. No coupon code required; the discount applies automatically at checkout.`, html: compactEmailMarkup(html) }); return { id: recipient.id, name: recipient.name, sent: true }; } catch { return { id: recipient.id, name: recipient.name, sent: false, reason: 'Provider unavailable' }; }
    })));
  }
  const sent = results.filter((result) => result.sent).length;
  await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'DISCOUNT_EMAIL_BATCH_SENT', metadata: { campaignId: campaign.id, selectedCount: ids.length, sentCount: sent, failedCount: results.length - sent } });
  return { selected: ids.length, sent, failed: results.length - sent, failures: results.filter((result) => !result.sent).map(({ id, name, reason }) => ({ id, name, reason })) };
}

export async function sendBonusCampaignToCustomers(input: { campaignId: string; customerIds: string[] }) {
  const authorization = await requirePermission(PermissionEnum.REWARDS_SETTINGS);
  const ids = [...new Set(input.customerIds)].slice(0, 500);
  if (!ids.length) throw new Error('Select at least one customer');
  const [campaign] = await db.select().from(promotionRule).where(and(eq(promotionRule.id, input.campaignId), eq(promotionRule.organizationId, authorization.organizationId), eq(promotionRule.kind, 'bonus'))).limit(1);
  const now = new Date();
  if (!campaign || !campaign.isActive || campaign.startsAt > now || campaign.endsAt < now || (campaign.lifecycleStatus && campaign.lifecycleStatus !== 'ACTIVE')) throw new Error('Bonus campaign is not active');
  if (campaign.usageLimit != null && campaign.usedCount >= campaign.usageLimit) throw new Error('This Bonus campaign has reached its award limit');
  const [branding] = await db.select({ organizationName: organization.name, displayName: businessSettings.displayName, receiptBusinessName: businessSettings.receiptBusinessName }).from(organization).leftJoin(businessSettings, eq(businessSettings.organizationId, organization.id)).where(eq(organization.id, authorization.organizationId)).limit(1);
  const recipients = await db.select({ id: customer.id, name: customer.name, email: customer.email }).from(customer).where(and(eq(customer.orgId, authorization.organizationId), or(...ids.map((id) => eq(customer.id, id)))));
  const merchant = branding?.receiptBusinessName || branding?.displayName || branding?.organizationName || 'Your store';
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
  const bonus = campaign.valueType === 'percentage' ? `${campaign.value}% Bonus` : `KES ${campaign.value} Bonus`;
  const results: Array<{ id: string; name: string; sent: boolean; reason?: string }> = [];
  for (let index = 0; index < recipients.length; index += 10) {
    results.push(...await Promise.all(recipients.slice(index, index + 10).map(async (recipient) => {
      if (!recipient.email) return { id: recipient.id, name: recipient.name, sent: false, reason: 'Invalid email' };
      const safeMerchant = escapeHtml(merchant); const safeName = escapeHtml(recipient.name || 'there'); const safeCampaign = escapeHtml(campaign.name); const safeBonus = escapeHtml(bonus);
      const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;color:#182230;font-family:Manrope,Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8"><tr><td align="center" style="padding:24px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e3e8ee;border-radius:12px;overflow:hidden"><tr><td style="height:4px;background:#f45113;font-size:0">&nbsp;</td></tr><tr><td align="center" style="padding:26px 28px 8px"><div style="font-size:15px;font-weight:800;letter-spacing:.03em;color:#f45113">${safeMerchant}</div><h1 style="margin:14px 0 6px;font-size:24px;line-height:1.25;color:#182230">Earn Bonus on your next purchase</h1><p style="margin:0;color:#68778b;font-size:14px;line-height:1.6">Hi ${safeName}, complete a qualifying purchase during this promotion and earn future promotional credit.</p></td></tr><tr><td style="padding:20px 28px 24px"><div style="border:1px solid #f1d4c7;border-radius:10px;background:#fffaf7;padding:22px;text-align:center"><div style="font-size:13px;color:#68778b">${safeCampaign}</div><div style="margin:10px 0;font-size:24px;font-weight:800;color:#e0440b">${safeBonus}</div><div style="font-size:13px;line-height:1.7;color:#68778b">Spend at least KES ${Number(campaign.minimumSpend).toLocaleString('en-KE')}<br>${campaign.valueType === 'percentage' ? `Maximum Bonus: KES ${Number(campaign.maximumDiscount ?? 0).toLocaleString('en-KE')}<br>` : ''}Bonus valid for ${campaign.bonusValidityDays ? `${campaign.bonusValidityDays} days after earning` : 'no expiry'}<br>Campaign ends: ${campaign.endsAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div><p style="margin:18px 0 0;text-align:center;color:#526176;font-size:13px;line-height:1.7">You pay normally for the qualifying purchase. Your Bonus is credited after successful completion and can be used on a future eligible purchase.<br><strong>No coupon code required.</strong></p></td></tr><tr><td style="border-top:1px solid #edf0f3;padding:15px 28px;color:#8a96a8;font-size:11px">You’re receiving this email because you registered as a customer of ${safeMerchant}.</td></tr></table></td></tr></table></body></html>`;
      try { await sendEmail({ to: { email: recipient.email, name: recipient.name }, subject: `Earn ${bonus} with ${merchant}`, text: `Earn ${bonus} when you spend at least KES ${campaign.minimumSpend}. Your Bonus is credited after successful completion and can be used on a future eligible purchase. No coupon code required.`, html: compactEmailMarkup(html) }); return { id: recipient.id, name: recipient.name, sent: true }; } catch { return { id: recipient.id, name: recipient.name, sent: false, reason: 'Provider unavailable' }; }
    })));
  }
  const sent = results.filter((result) => result.sent).length;
  await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'BONUS_EMAIL_BATCH_SENT', metadata: { campaignId: campaign.id, selectedCount: ids.length, sentCount: sent, failedCount: results.length - sent } });
  return { selected: ids.length, sent, failed: results.length - sent, failures: results.filter((result) => !result.sent).map(({ id, name, reason }) => ({ id, name, reason })) };
}

function refreshPromotionPages() {
  revalidatePath('/dashboard/promotions/coupons');
  revalidatePath('/dashboard/promotions/discounts');
  revalidatePath('/dashboard/promotions/bonuses');
  revalidatePath('/dashboard/pos');
}

export async function getPromotions(kind: z.infer<typeof kindSchema>) {
  const type = kindSchema.parse(kind);
  const authorization = await requirePermission(PermissionEnum.REWARDS_VIEW);
  return db
    .select()
    .from(promotionRule)
    .where(
      and(
        eq(promotionRule.organizationId, authorization.organizationId),
        eq(promotionRule.kind, type)
      )
    )
    .orderBy(asc(promotionRule.name));
}
export async function quoteAutomaticDiscount(input: { subtotal: number }) {
  const authorization = await requirePermission(PermissionEnum.REWARDS_VIEW); const now = new Date();
  const rows = await db.select().from(promotionRule).where(and(eq(promotionRule.organizationId, authorization.organizationId), eq(promotionRule.kind, 'discount'), eq(promotionRule.isActive, true)));
  const eligible = rows.filter((r) => r.startsAt <= now && r.endsAt >= now && (!r.lifecycleStatus || r.lifecycleStatus === 'ACTIVE') && input.subtotal >= Number(r.minimumSpend));
  const best = eligible.map((r) => ({ r, amount: Math.min(input.subtotal, r.valueType === 'percentage' ? input.subtotal * Number(r.value) / 100 : Number(r.value), Number(r.maximumDiscount ?? Infinity)) })).sort((a,b) => b.amount-a.amount)[0];
  return best ? { campaignId: best.r.id, campaignName: best.r.name, discountAmount: Number(best.amount.toFixed(2)) } : null;
}

async function ensureUniqueCode(
  organizationId: string,
  code: string | null,
  excludeId?: string
) {
  if (!code) return;
  const conditions = [
    eq(promotionRule.organizationId, organizationId),
    eq(promotionRule.code, code),
  ];
  if (excludeId) conditions.push(ne(promotionRule.id, excludeId));
  const [existing] = await db
    .select({ id: promotionRule.id })
    .from(promotionRule)
    .where(and(...conditions))
    .limit(1);
  if (existing) throw new Error('That promotion code is already in use');
}

export async function createPromotion(input: PromotionInput) {
  const data = inputSchema.parse(input);
  const authorization = await requirePermission(
    PermissionEnum.REWARDS_SETTINGS
  );
  const code = data.code ? data.code.toUpperCase().replace(/\s+/g, '') : null;
  await ensureUniqueCode(authorization.organizationId, code);
  const id = generateId();
  await db.transaction(async (tx) => {
    await tx
      .insert(promotionRule)
      .values({
        id,
        organizationId: authorization.organizationId,
        createdBy: authorization.userId,
        name: data.name,
        code,
        description: data.description || null,
        kind: data.kind,
        valueType: data.valueType,
        value: String(data.value),
        minimumSpend: String(data.minimumSpend),
        maximumDiscount: data.maximumDiscount
          ? String(data.maximumDiscount)
          : null,
        usageLimit: data.usageLimit ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        isActive: data.isActive,
      });
    await tx
      .insert(auditEvent)
      .values({
        id: generateId(),
        organizationId: authorization.organizationId,
        userId: authorization.userId,
        action: 'promotion.created',
        metadata: { promotionId: id, kind: data.kind, code },
      });
  });
  refreshPromotionPages();
  return { id };
}

export async function updatePromotion(id: string, input: PromotionInput) {
  const data = inputSchema.parse(input);
  const authorization = await requirePermission(
    PermissionEnum.REWARDS_SETTINGS
  );
  const code = data.code ? data.code.toUpperCase().replace(/\s+/g, '') : null;
  await ensureUniqueCode(authorization.organizationId, code, id);
  const result = await db
    .update(promotionRule)
    .set({
      name: data.name,
      code,
      description: data.description || null,
      kind: data.kind,
      valueType: data.valueType,
      value: String(data.value),
      minimumSpend: String(data.minimumSpend),
      maximumDiscount: data.maximumDiscount
        ? String(data.maximumDiscount)
        : null,
      usageLimit: data.usageLimit ?? null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(promotionRule.id, id),
        eq(promotionRule.organizationId, authorization.organizationId)
      )
    )
    .returning({ id: promotionRule.id });
  if (!result.length) throw new Error('Promotion not found');
  await db
    .insert(auditEvent)
    .values({
      id: generateId(),
      organizationId: authorization.organizationId,
      userId: authorization.userId,
      action: 'promotion.updated',
      metadata: { promotionId: id, kind: data.kind, code },
    });
  refreshPromotionPages();
}

export async function setPromotionActive(id: string, active: boolean) {
  const authorization = await requirePermission(
    PermissionEnum.REWARDS_SETTINGS
  );
  const result = await db
    .update(promotionRule)
    .set({ isActive: active, updatedAt: new Date() })
    .where(
      and(
        eq(promotionRule.id, id),
        eq(promotionRule.organizationId, authorization.organizationId)
      )
    )
    .returning({ kind: promotionRule.kind });
  if (!result.length) throw new Error('Promotion not found');
  await db
    .insert(auditEvent)
    .values({
      id: generateId(),
      organizationId: authorization.organizationId,
      userId: authorization.userId,
      action: active ? 'promotion.activated' : 'promotion.archived',
      metadata: { promotionId: id },
    });
  refreshPromotionPages();
}

export async function setBonusCampaignStatus(id: string, status: 'ACTIVE'|'PAUSED'|'ENDED') {
  const authorization = await requirePermission(PermissionEnum.REWARDS_SETTINGS);
  const [row] = await db.select({ status: promotionRule.lifecycleStatus, kind: promotionRule.kind }).from(promotionRule).where(and(eq(promotionRule.id,id),eq(promotionRule.organizationId,authorization.organizationId))).limit(1);
  if (!row || row.kind !== 'bonus') throw new Error('Bonus campaign not found');
  if (status === 'ACTIVE' && row.status === 'ENDED') throw new Error('This campaign has already ended.');
  await db.update(promotionRule).set({ lifecycleStatus: status, isActive: status === 'ACTIVE', updatedAt: new Date() }).where(eq(promotionRule.id,id));
  await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId, action: `BONUS_CAMPAIGN_${status}`, metadata: { promotionId: String(id), previousStatus: String(row.status ?? 'UNKNOWN'), newStatus: String(status) } });
  // The table is updated immediately by the client. Avoid revalidating the
  // current server-action route here; Next 16's webpack action transport can
  // attempt to enumerate an empty revalidation payload and throw Object.entries.
  return status;
}

export async function validateCoupon(codeInput: string, orderAmount: number) {
  const authorization = await requirePermission(PermissionEnum.POS_DISCOUNT);
  const code = z
    .string()
    .trim()
    .min(1)
    .max(40)
    .parse(codeInput)
    .toUpperCase()
    .replace(/\s+/g, '');
  const amount = z.number().finite().nonnegative().parse(orderAmount);
  const [coupon] = await db
    .select()
    .from(promotionRule)
    .where(
      and(
        eq(promotionRule.organizationId, authorization.organizationId),
        eq(promotionRule.kind, 'coupon'),
        eq(promotionRule.code, code)
      )
    )
    .limit(1);
  if (!coupon) throw new Error('Coupon code was not found');
  const now = new Date();
  if (!coupon.isActive) throw new Error('This coupon is inactive');
  if (coupon.startsAt > now) throw new Error('This coupon is not active yet');
  if (coupon.endsAt < now) throw new Error('This coupon has expired');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    throw new Error('This coupon has reached its usage limit');
  if (amount < Number(coupon.minimumSpend))
    throw new Error(
      `Minimum spend is KES ${Number(coupon.minimumSpend).toLocaleString()}`
    );
  let discount =
    coupon.valueType === 'percentage'
      ? (amount * Number(coupon.value)) / 100
      : Number(coupon.value);
  if (coupon.maximumDiscount != null)
    discount = Math.min(discount, Number(coupon.maximumDiscount));
  return {
    id: coupon.id,
    code,
    name: coupon.name,
    amount: Math.min(amount, Number(discount.toFixed(2))),
    valueType: coupon.valueType,
    value: Number(coupon.value),
  };
}
