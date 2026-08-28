'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auditEvent, promotionRule } from '@/lib/db/schema';
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
