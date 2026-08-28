'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify';
import { revokeStaffSessions } from '@/app/actions/admin-actions';
import { Button } from '@/components/ui/button';

export function RevokeSessionsButton({
  userId,
  name,
  disabled,
}: {
  userId: string;
  name: string;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const revoke = async () => {
    if (!confirm(`Sign ${name} out of all browser and POS sessions?`)) return;
    setBusy(true);
    try {
      await revokeStaffSessions(userId);
      notify.success(`${name} signed out`);
      router.refresh();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Unable to revoke sessions'
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={revoke}
      disabled={disabled || busy}
      className="gap-2"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-3.5 w-3.5" />
      )}
      Revoke sessions
    </Button>
  );
}
