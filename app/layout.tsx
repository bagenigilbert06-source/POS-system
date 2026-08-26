import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppToaster } from '@/components/ui/app-toaster';
import { PageLoader } from '@/components/ui/page-loader';

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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){document.addEventListener('DOMContentLoaded',function(){window.setTimeout(function(){window.setTimeout(function(){var l=document.querySelector('[data-pesaby-initial-loader]');if(l){l.style.transition='opacity 400ms';l.style.opacity='0';window.setTimeout(function(){l.style.display='none'},400)}},100)},500)})})();`,
          }}
        />
      </head>
      <body
        className="font-sans text-base antialiased"
        suppressHydrationWarning
      >
        <PageLoader initial />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
