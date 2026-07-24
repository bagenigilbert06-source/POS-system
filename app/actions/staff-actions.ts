'use server'

import { db } from '@/lib/db'
import { employee, shift, shiftAssignment, employeeCommission } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { OrganizationService } from '@/lib/services/organization-service'
import { nanoid } from 'nanoid'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const org = await OrganizationService.getPrimaryOrganization(userId)
  if (!org) throw new Error('Organization not found')
  return org.id
}

export async function createEmployee(data: {
  name: string
  email?: string
  phone?: string
  role: string
  department?: string
  salary: number
  status?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const newEmployee = await db
      .insert(employee)
      .values({
        id: nanoid(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        department: data.department,
        salary: data.salary.toString(),
        status: data.status || 'active',
        orgId,
        userId,
      })
      .returning()

    return { success: true, employee: newEmployee[0] }
  } catch (error) {
    console.error('[v0] Error creating employee:', error)
    throw new Error('Failed to create employee')
  }
}

export async function updateEmployee(employeeId: string, data: {
  name?: string
  email?: string
  phone?: string
  role?: string
  department?: string
  salary?: number
  status?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const updated = await db
      .update(employee)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.role && { role: data.role }),
        ...(data.department && { department: data.department }),
        ...(data.salary !== undefined && { salary: data.salary.toString() }),
        ...(data.status && { status: data.status }),
      })
      .where(and(eq(employee.id, employeeId), eq(employee.orgId, orgId)))
      .returning()

    return { success: true, employee: updated[0] }
  } catch (error) {
    console.error('[v0] Error updating employee:', error)
    throw new Error('Failed to update employee')
  }
}

export async function deleteEmployee(employeeId: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    await db
      .delete(employee)
      .where(and(eq(employee.id, employeeId), eq(employee.orgId, orgId)))

    return { success: true }
  } catch (error) {
    console.error('[v0] Error deleting employee:', error)
    throw new Error('Failed to delete employee')
  }
}

export async function createShift(data: {
  name: string
  startTime: string // HH:mm
  endTime: string   // HH:mm
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const newShift = await db
      .insert(shift)
      .values({
        id: nanoid(),
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        orgId,
      })
      .returning()

    return { success: true, shift: newShift[0] }
  } catch (error) {
    console.error('[v0] Error creating shift:', error)
    throw new Error('Failed to create shift')
  }
}

export async function assignShift(data: {
  employeeId: string
  shiftId: string
  date: Date
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const assignment = await db
      .insert(shiftAssignment)
      .values({
        id: nanoid(),
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        date: data.date,
        orgId,
      })
      .returning()

    return { success: true, assignment: assignment[0] }
  } catch (error) {
    console.error('[v0] Error assigning shift:', error)
    throw new Error('Failed to assign shift')
  }
}

export async function recordCommission(data: {
  employeeId: string
  amount: number
  period: string // YYYY-MM
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const commission = await db
      .insert(employeeCommission)
      .values({
        id: nanoid(),
        employeeId: data.employeeId,
        amount: data.amount.toString(),
        period: data.period,
        status: 'pending',
        orgId,
      })
      .returning()

    return { success: true, commission: commission[0] }
  } catch (error) {
    console.error('[v0] Error recording commission:', error)
    throw new Error('Failed to record commission')
  }
}
