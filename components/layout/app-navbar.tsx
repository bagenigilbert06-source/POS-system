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
  onOpenSidebar?: () => void
}

export function AppNavbar({ userName, userEmail, organizationName, branchName, onOpenSidebar }: AppNavbarProps) {
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
    <header className="dashboard-navbar sticky top-0 z-30 flex h-16 items-center justify-between border-b px-3 shadow-sm backdrop-blur-md sm:px-5 lg:px-6 xl:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm font-extrabold text-[#050a1f]">{organizationName}</p>
          <p className="truncate text-xs text-[#7c8799]">{branchName ? `${branchName} · Operating workspace` : 'Operating workspace'}</p>
        </div>
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          <PesabyLogoMark className="h-8 w-8" />
          <div><p className="truncate text-sm font-extrabold text-[#050a1f]">Pesaby</p><p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8799]">Business OS</p></div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
          <button
            className="group flex items-center gap-2 rounded-lg border border-border bg-background/80 px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted sm:px-3"
            aria-label="Open account menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ffda32] text-[#050a1f]">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden max-w-[140px] truncate font-medium md:block">
              {userName ?? 'Account'}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl border-[#dfe2e7] p-2 shadow-md">
            <DropdownMenuLabel className="px-2 py-2 font-normal">
              <p className="truncate text-sm font-semibold text-foreground">{userName || 'Pesaby account'}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut} className="gap-3 rounded-lg px-2 py-2.5 text-muted-foreground focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
