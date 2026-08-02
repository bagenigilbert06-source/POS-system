'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import {
  LogOut,
  ChevronDown,
  User,
  Menu,
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
}

export function AppNavbar({ userName, userEmail, organizationName, branchName, workspaceDescription, onOpenSidebar }: AppNavbarProps) {
  const router = useRouter()

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
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(255,214,10,0.12)] bg-[rgba(255,255,255,0.05)] text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-[rgba(255,255,255,0.08)] transition-all lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm font-bold text-[#f5f5f7]">{organizationName}{branchName ? ` · ${branchName}` : ''}</p>
          <p className="max-w-[720px] truncate text-xs text-[#a1a1a6]">{workspaceDescription}</p>
        </div>
        <div className="flex min-w-0 items-center gap-3 md:hidden">
          <PesabyLogoMark className="h-8 w-8" />
          <div><p className="truncate text-sm font-bold text-[#f5f5f7]">{organizationName}</p><p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#a1a1a6]">Business OS</p></div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
          <button
            className="group flex items-center gap-2 rounded-lg border border-[rgba(255,214,10,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm text-[#f5f5f7] transition-all hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,214,10,0.16)]"
            aria-label="Open account menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffd60a] text-[#0b0b0d]">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden max-w-[140px] truncate font-medium md:block">
              {userName ?? 'Account'}
            </span>
            <ChevronDown className="h-4 w-4 text-[#a1a1a6]" />
          </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl border border-[rgba(255,214,10,0.12)] bg-[#1c1c1e] p-2 text-[#f5f5f7] shadow-dark-lg">
            <DropdownMenuLabel className="px-3 py-3 font-normal">
              <p className="truncate text-sm font-semibold text-[#f5f5f7]">{userName || 'Pesaby account'}</p>
              <p className="mt-1 truncate text-xs text-[#a1a1a6]">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[rgba(255,214,10,0.08)]" />
            <DropdownMenuItem onSelect={handleSignOut} className="gap-3 rounded-lg px-3 py-2.5 text-[#a1a1a6] focus:bg-[rgba(255,76,77,0.1)] focus:text-[#ff6961]">
              <LogOut className="h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
