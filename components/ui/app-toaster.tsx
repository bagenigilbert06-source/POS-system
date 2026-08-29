'use client';

import { Toaster } from 'react-hot-toast';

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 4000,
        className: '!rounded-lg !border !border-border !bg-popover !px-4 !py-3 !text-sm !text-popover-foreground !shadow-lg',
        success: { duration: 3500, iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' } },
        error: { duration: 6000, iconTheme: { primary: '#dc2626', secondary: '#fef2f2' } },
        loading: { duration: Infinity },
      }}
    />
  );
}
