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
        success: { duration: 3500 },
        error: { duration: 6000 },
        loading: { duration: Infinity },
      }}
    />
  );
}
