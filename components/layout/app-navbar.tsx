'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  Bell,
  ChevronDown,
  User,
  Menu,
  Search,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface AppNavbarProps {
  userName?: string | null
  userEmail?: string | null
  onOpenSidebar?: () => void
}

export function AppNavbar({ userName, userEmail, onOpenSidebar }: AppNavbarProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur-md dark:bg-card/90 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden min-w-0 max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-[#f7f7f4] px-3 py-2 text-sm text-muted-foreground md:flex dark:bg-background">
          <Search className="h-4 w-4" />
          <span className="truncate">Search products, customers, orders</span>
        </div>
        <div className="min-w-0 md:hidden">
          <p className="truncate text-sm font-semibold text-foreground">PESABY</p>
          <p className="truncate text-xs text-muted-foreground">Business OS</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme toggle */}
        <div className="hidden min-h-[38px] items-center rounded-md border border-border bg-[#f7f7f4] p-0.5 sm:flex dark:bg-background">
          {mounted ? (
            themeOptions.map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'rounded p-2 transition-all duration-200',
                  theme === value
                    ? 'bg-white text-foreground shadow-sm dark:bg-card'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={`Switch to ${value} theme`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))
          ) : (
            <div className="flex">
              {themeOptions.map(({ value, icon: Icon }) => (
                <span key={value} className="rounded p-2 text-muted-foreground" aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive shadow-sm" />
          <span className="sr-only">Notifications</span>
        </button>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm hover:bg-muted transition-all duration-200 group sm:px-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#e4efe7] text-[#1f5132] transition-all dark:bg-primary/15 dark:text-primary">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden max-w-[140px] truncate font-medium md:block">
              {userName ?? 'Account'}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', profileOpen && 'rotate-180')} />
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-xl divide-y divide-border">
                <div className="p-4">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">{userEmail}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
