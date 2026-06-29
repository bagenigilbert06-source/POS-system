"use client";

/**
 * AlertCard Component
 * Reusable alert/notification card for dashboard alerts
 */

import { AlertTriangle, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

type AlertType = 'warning' | 'error' | 'success' | 'info';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
}

interface AlertCardProps {
  alert: Alert;
  compact?: boolean;
}

interface AlertListProps {
  alerts: Alert[];
  maxItems?: number;
  title?: string;
}

const ALERT_CONFIG = {
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    titleColor: 'text-yellow-900',
    messageColor: 'text-yellow-700',
    iconColor: 'text-yellow-600',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    titleColor: 'text-red-900',
    messageColor: 'text-red-700',
    iconColor: 'text-red-600',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    titleColor: 'text-green-900',
    messageColor: 'text-green-700',
    iconColor: 'text-green-600',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    titleColor: 'text-blue-900',
    messageColor: 'text-blue-700',
    iconColor: 'text-blue-600',
  },
};

export function AlertCard({ alert, compact = false }: AlertCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const config = ALERT_CONFIG[alert.type];
  const IconComponent = config.icon;

  return (
    <div className={`${config.bgColor} border-l-4 ${config.borderColor} rounded p-4`}>
      <div className="flex gap-3">
        <IconComponent className={`h-5 w-5 flex-shrink-0 ${config.iconColor}`} />

        <div className="flex-1">
          <h3 className={`font-medium ${config.titleColor}`}>{alert.title}</h3>
          {!compact && <p className={`mt-1 text-sm ${config.messageColor}`}>{alert.message}</p>}

          {alert.action && (
            <button
              onClick={alert.action.onClick}
              className={`mt-2 text-sm font-medium underline ${config.titleColor} hover:opacity-75`}
            >
              {alert.action.label}
            </button>
          )}
        </div>

        {alert.dismissible && (
          <button
            onClick={() => {
              setDismissed(true);
              alert.onDismiss?.();
            }}
            className={`flex-shrink-0 ${config.iconColor} hover:opacity-75`}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AlertList({ alerts, maxItems = 3, title = 'Alerts' }: AlertListProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id)).slice(0, maxItems);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">{title}</h3>

      {visibleAlerts.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No alerts</p>
      ) : (
        <div className="space-y-3">
          {visibleAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={{
                ...alert,
                onDismiss: () => {
                  setDismissedAlerts((prev) => new Set([...prev, alert.id]));
                  alert.onDismiss?.();
                },
              }}
              compact
            />
          ))}
        </div>
      )}

      {alerts.length > maxItems && (
        <p className="mt-4 text-center text-sm text-gray-500">+{alerts.length - maxItems} more alerts</p>
      )}
    </div>
  );
}

// Skeleton
export function AlertListSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 h-6 w-20 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-5 w-5 flex-shrink-0 animate-pulse rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
