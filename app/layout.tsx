import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'POS System — Smart Business Platform for Modern Enterprises',
    template: '%s | POS System',
  },
  description:
    'Europe&apos;s leading platform for e-commerce and business management. Manage orders, inventory, customers, and analytics in one beautiful, easy-to-use system. Start free.',
  keywords: ['POS', 'e-commerce', 'business platform', 'inventory management', 'order management', 'analytics', 'shipping'],
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
