'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-10 w-10" />
  }

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  const currentTheme = themes.find((t) => t.value === theme)
  const CurrentIcon = currentTheme?.icon || Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          <CurrentIcon className="h-5 w-5 text-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((t) => {
          const Icon = t.icon
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={theme === t.value ? 'bg-primary/10' : ''}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{t.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
