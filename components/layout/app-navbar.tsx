'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import {
  LogOut,
  ChevronDown,
  User,
  Menu,
  ShieldCheck,
  UserRound,
  Settings,
} from 'lucide-react'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'
import { ThemeSwitcher } from '@/components/theme-switcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AppNavbarProps {
  userName?: string | null
  userEmail?: string | null
  organizationName: string
  branchName?: string | null
  workspaceDescription: string
  onOpenSidebar?: () => void
  role?: string
}

function formatRole(role?: string) {
  if (!role) return 'Team member'
  return role
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function AppNavbar({ userName, userEmail, organizationName, branchName, workspaceDescription, onOpenSidebar, role }: AppNavbarProps) {
  const router = useRouter()
  const roleLabel = formatRole(role)
  const roleTitle = role === 'admin' ? 'Administrator' : role === 'owner' ? 'Business owner' : roleLabel
  const roleScope = role === 'admin' || role === 'owner' ? 'Organization access' : role === 'manager' ? 'Branch operations' : 'Assigned workspace'

  const clearStoredAuthState = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('accessToken')
    }
  }

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } finally {
      clearStoredAuthState()
      router.replace('/sign-in')
      router.refresh()
    }
  }

  return (
    <header className="dashboard-navbar sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4 xl:max-w-[40%]">
        <button
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(255,214,10,0.12)] bg-[rgba(255,255,255,0.05)] text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-[rgba(255,255,255,0.08)] transition-all lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden min-w-0 md:block">
          <div className="flex min-w-0 items-center gap-2.5">
            <p className="truncate text-sm font-bold text-[#f5f5f7]">{organizationName}{branchName ? ` · ${branchName}` : ''}</p>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/70 px-2 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.07em] text-foreground xl:hidden">
              <ShieldCheck className="h-3 w-3 text-muted-foreground" aria-hidden="true" />{roleTitle}
            </span>
          </div>
          <p className="mt-0.5 max-w-[720px] truncate text-xs text-[#a1a1a6]">{role === 'cashier' ? 'Sales, shifts, receipts and customer checkout' : workspaceDescription}</p>
        </div>
        <div className="flex min-w-0 items-center gap-3 md:hidden">
          <PesabyLogoMark className="h-8 w-8" />
          <div className="min-w-0"><p className="truncate text-sm font-bold text-[#f5f5f7]">{organizationName}</p><p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{roleTitle}</p></div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center gap-2.5 rounded-xl border border-border bg-background/90 px-3 py-1.5 shadow-sm backdrop-blur xl:flex" aria-label={`${roleTitle}, ${roleScope}`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="leading-tight">
          <span className="block text-xs font-bold text-foreground">{roleTitle}</span>
          <span className="block text-[10px] font-medium text-muted-foreground">{roleScope}</span>
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
          <button
            className="group flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
            aria-label="Open account menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffd60a] text-[#0b0b0d]">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden max-w-[140px] truncate font-medium md:block">
              {userName ?? 'Account'}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-lg">
            <DropdownMenuLabel className="px-3 py-3 font-normal">
              <p className="truncate text-sm font-semibold text-foreground">{userName || 'Pesaby account'}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{userEmail}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.07em] text-foreground"><ShieldCheck className="h-3 w-3 text-muted-foreground" />{roleTitle}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onSelect={() => router.push('/dashboard/admin/profile')} className="gap-3 rounded-lg px-3 py-2.5 text-muted-foreground focus:bg-muted focus:text-foreground">
              <UserRound className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/dashboard/settings')} className="gap-3 rounded-lg px-3 py-2.5 text-muted-foreground focus:bg-muted focus:text-foreground">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onSelect={handleSignOut} className="gap-3 rounded-lg px-3 py-2.5 text-muted-foreground focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/30 dark:focus:text-red-300">
              <LogOut className="h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
