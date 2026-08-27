'use client';

import {
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={(resolvedTheme || 'system') as ToasterProps['theme']}
      position="top-right"
      offset={{ top: 20, right: 20 }}
      mobileOffset={{ top: 14, right: 14, left: 14 }}
      gap={10}
      visibleToasts={5}
      duration={4000}
      expand
      closeButton
      icons={{
        success: <Check aria-hidden="true" />,
        error: <CircleAlert aria-hidden="true" />,
        warning: <TriangleAlert aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        loading: <LoaderCircle aria-hidden="true" className="animate-spin" />,
        close: <X aria-hidden="true" />,
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: 'Dismiss notification',
        classNames: {
          toast: 'pesaby-alert',
          content: 'pesaby-alert-content',
          title: 'pesaby-alert-title',
          description: 'pesaby-alert-description',
          icon: 'pesaby-alert-icon',
          closeButton: 'pesaby-alert-close',
          actionButton: 'pesaby-alert-action',
          cancelButton: 'pesaby-alert-cancel',
          success: 'pesaby-alert-success',
          error: 'pesaby-alert-error',
          warning: 'pesaby-alert-warning',
          info: 'pesaby-alert-info',
          loading: 'pesaby-alert-loading',
        },
      }}
      className="pesaby-alert-stack"
      containerAriaLabel="Pesaby notifications"
    />
  );
}
