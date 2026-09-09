import { redirect } from 'next/navigation'
import { getAuthorizationContext } from '@/lib/auth/authorization'
import { RoleEnum } from '@/lib/types/permissions'

export default async function HistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if ((await getAuthorizationContext()).role === RoleEnum.CASHIER) redirect('/dashboard/pos')
  return children
}
