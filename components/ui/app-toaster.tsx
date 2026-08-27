'use client';

import { X } from 'lucide-react';
import { Toaster, ToastBar, toast } from 'react-hot-toast';

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={10}
      containerClassName="pesaby-hot-toast-stack"
      containerStyle={{ top: 16, right: 16, bottom: 16, left: 16 }}
      toastOptions={{
        className: 'pesaby-hot-toast',
        duration: 4000,
        success: {
          duration: 3500,
          className: 'pesaby-hot-toast pesaby-hot-toast-success',
          iconTheme: { primary: '#16a34a', secondary: '#ffffff' },
        },
        error: {
          duration: 6000,
          className: 'pesaby-hot-toast pesaby-hot-toast-error',
          iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
        },
        loading: {
          duration: Infinity,
          className: 'pesaby-hot-toast pesaby-hot-toast-loading',
          iconTheme: { primary: '#d99a00', secondary: 'transparent' },
        },
      }}
    >
      {(currentToast) => (
        <ToastBar toast={currentToast}>
          {({ icon, message }) => (
            <>
              <span className="pesaby-hot-toast-icon" aria-hidden="true">{icon}</span>
              <div className="pesaby-hot-toast-message">{message}</div>
              {currentToast.type !== 'loading' && (
                <button
                  type="button"
                  className="pesaby-hot-toast-close"
                  aria-label="Dismiss notification"
                  onClick={() => toast.dismiss(currentToast.id)}
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
