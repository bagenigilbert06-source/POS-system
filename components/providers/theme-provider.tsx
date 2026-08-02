'use client'

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { ReactNode, useEffect } from 'react'

interface ThemeProviderProps {
  children: ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}><SystemThemeSync />{children}</NextThemesProvider>
}

/** Keep System mode synchronized with the browser/OS preference in real time. */
function SystemThemeSync() {
  const { theme } = useTheme()

  useEffect(() => {
    if (theme !== 'system') return

    const preference = window.matchMedia('(prefers-color-scheme: dark)')
    const applyPreference = (dark: boolean) => {
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.dataset.pesabyTheme = dark ? 'dark' : 'light'
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }
    const onChange = (event: MediaQueryListEvent) => applyPreference(event.matches)

    applyPreference(preference.matches)
    preference.addEventListener('change', onChange)
    return () => preference.removeEventListener('change', onChange)
  }, [theme])

  return null
}
