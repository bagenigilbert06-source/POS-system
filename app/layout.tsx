import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'IMARA — Business OS for Growing Businesses',
    template: '%s | IMARA',
  },
  description:
    'IMARA is a complete Business Operating System — POS, inventory, customers, purchasing, finance, employees, multi-branch, and analytics in one platform. Built for African commerce.',
  keywords: ['Business OS', 'POS', 'Kenya', 'business management', 'inventory', 'sales', 'M-Pesa', 'IMARA', 'ERP', 'retail', 'restaurant'],
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
