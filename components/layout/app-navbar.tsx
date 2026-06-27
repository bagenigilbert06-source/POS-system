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
} from 'lucide-react'
import { useState } from 'react'

interface AppNavbarProps {
  userName?: string
  userEmail?: string
}

export function AppNavbar({ userName, userEmail }: AppNavbarProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [profileOpen, setProfileOpen] = useState(false)

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6 gap-4">
      {/* Left: Brand tagline */}
      <div className="flex items-center gap-3 flex-1">
        <div className="hidden md:block">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dashboard</p>
          <p className="text-sm text-foreground font-medium">Business Operating System</p>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <div className="hidden sm:flex items-center rounded-lg border border-border bg-secondary p-1">
          {themeOptions.map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'rounded-md p-2 transition-all duration-200',
                theme === value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={`Switch to ${value} theme`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive shadow-sm" />
          <span className="sr-only">Notifications</span>
        </button>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-secondary transition-all duration-200 group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
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
              <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-border bg-card shadow-lg divide-y divide-border overflow-hidden">
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
