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
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      {/* Left: breadcrumb placeholder */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Business Operating System</span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <div className="flex items-center rounded-md border bg-background p-0.5">
          {themeOptions.map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'rounded p-1.5 transition-colors',
                theme === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={`Switch to ${value} theme`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* Notifications */}
        <button className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          <span className="sr-only">Notifications</span>
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-secondary transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="hidden max-w-[120px] truncate font-medium sm:block">
              {userName ?? 'Account'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border bg-popover shadow-lg">
                <div className="border-b p-3">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
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
