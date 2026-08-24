import { cookies } from 'next/headers'

export const ACTIVE_ORGANIZATION_COOKIE = 'pesaby_active_organization'

export async function getActiveOrganizationId() {
  return (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value || null
}
