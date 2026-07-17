import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
export default async function Layout({ children }: { children: React.ReactNode }) { await requireWorkspaceModule('products'); return children }
