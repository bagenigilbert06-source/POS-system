'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  auditEvent,
  branch,
  branchMembership,
  employee,
  user,
} from '@/lib/db/schema';
import { requireFullAuthentication } from '@/lib/auth/authorization';
import { generateId } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(100),
  phone: z.string().trim().max(30).optional(),
  image: z.string().trim().max(2048).nullable().optional(),
});

function validProfileImage(value: string | null | undefined) {
  if (!value) return true;
  if (value.startsWith('/uploads/profile/')) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export async function getOwnProfile() {
  const authorization = await requireFullAuthentication();
  const [[account], [staff], locations] = await Promise.all([
    db.select().from(user).where(eq(user.id, authorization.userId)).limit(1),
    db
      .select({
        phone: employee.phone,
        department: employee.department,
        joinDate: employee.joinDate,
      })
      .from(employee)
      .where(
        and(
          eq(employee.userId, authorization.userId),
          eq(employee.orgId, authorization.organizationId)
        )
      )
      .limit(1),
    db
      .select({ id: branch.id, name: branch.name })
      .from(branchMembership)
      .innerJoin(branch, eq(branch.id, branchMembership.branchId))
      .where(eq(branchMembership.userId, authorization.userId)),
  ]);
  if (!account) throw new Error('Account not found');
  return { account, staff: staff ?? null, locations, role: authorization.role };
}

export async function updateOwnProfile(input: z.input<typeof profileSchema>) {
  const data = profileSchema.parse(input);
  if (!validProfileImage(data.image))
    throw new Error('Choose a valid profile image');
  const authorization = await requireFullAuthentication();
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({
        name: data.name,
        phone: data.phone || null,
        ...(data.image !== undefined ? { image: data.image || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, authorization.userId));
    await tx
      .update(employee)
      .set({
        name: data.name,
        phone: data.phone || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(employee.userId, authorization.userId),
          eq(employee.orgId, authorization.organizationId)
        )
      );
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: authorization.organizationId,
      userId: authorization.userId,
      action: 'profile.updated',
      metadata: { avatarChanged: data.image !== undefined },
    });
  });
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/profile');
}

export async function removeOwnAvatar() {
  const authorization = await requireFullAuthentication();
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({ image: null, updatedAt: new Date() })
      .where(eq(user.id, authorization.userId));
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: authorization.organizationId,
      userId: authorization.userId,
      action: 'profile.avatar_removed',
      metadata: {},
    });
  });
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/profile');
}
