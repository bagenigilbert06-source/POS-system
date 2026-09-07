import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppToaster } from '@/components/ui/app-toaster';

export const metadata: Metadata = {
  title: {
    default: 'Pesaby — Business OS for Modern Commerce',
    template: '%s | Pesaby',
  },
  description:
    'Pesaby is an all-in-one POS and business operating system for modern commerce. Manage checkout, inventory, payments, customers, branches, and reports from one clean workspace.',
  keywords: [
    'POS',
    'Kenya',
    'business',
    'inventory',
    'sales',
    'KES',
    'M-Pesa',
    'Pesaby',
  ],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icons/pesaby-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/pesaby-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/pesaby-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className="bg-background"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='theme',s=localStorage.getItem(k),d=window.matchMedia('(prefers-color-scheme: dark)').matches,t=s==='dark'||(s!=='light'&&d);document.documentElement.classList.toggle('dark',t);document.documentElement.dataset.pesabyTheme=t?'dark':'light';document.documentElement.style.colorScheme=t?'dark':'light'}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="font-sans text-base antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
