'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  Bell,
  CalendarDays,
  LogOut,
  Headphones,
  Menu,
  ShieldCheck,
  UserRound,
  Settings,
} from 'lucide-react';
import { PesabyLogoMark } from '@/components/brand/pesaby-logo';
import { ThemeSwitcher } from '@/components/theme-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppNavbarProps {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  organizationName: string;
  branchName?: string | null;
  workspaceDescription: string;
  onOpenSidebar?: () => void;
  role?: string;
  unreadNotificationCount?: number;
}

function formatRole(role?: string) {
  if (!role) return 'Team member';
  return role
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AppNavbar({
  userName,
  userEmail,
  userImage,
  organizationName,
  branchName,
  workspaceDescription,
  onOpenSidebar,
  role,
  unreadNotificationCount = 0,
}: AppNavbarProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const roleLabel = formatRole(role);
  const roleTitle =
    role === 'admin'
      ? 'Administrator'
      : role === 'owner'
        ? 'Business owner'
        : roleLabel;
  const initials = (userName || userEmail || 'Account')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const clearStoredAuthState = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('accessToken');
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } finally {
      clearStoredAuthState();
      router.replace('/sign-in');
      router.refresh();
    }
  };

  return (
    <header className="dashboard-navbar sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b px-4 sm:px-6 lg:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] transition-colors hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden min-w-0 md:block">
          <div className="flex min-w-0 items-center gap-2.5">
            <p className="truncate text-sm font-bold text-[var(--dashboard-text)]">
              {organizationName}
              {branchName ? ` · ${branchName}` : ''}
            </p>
          </div>
          <p className="mt-0.5 max-w-[620px] truncate text-xs text-[var(--dashboard-muted)]">
            {role === 'cashier'
              ? 'Sales, shifts, receipts and customer checkout'
              : workspaceDescription}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3 md:hidden">
          <PesabyLogoMark className="h-8 w-8" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#f5f5f7]">
              {organizationName}
            </p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {roleTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 lg:gap-4">
        <label className="relative hidden h-10 w-[150px] items-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] sm:flex">
          <span className="sr-only">Dashboard date</span>
          {!selectedDate && (
            <span className="pointer-events-none absolute left-3 text-xs font-medium text-[var(--dashboard-muted)]">
              Date
            </span>
          )}
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            aria-label="Dashboard date"
            className={`h-full min-w-0 flex-1 bg-transparent py-2 pl-3 pr-9 text-xs font-medium outline-none [color-scheme:light] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dashboard-accent)] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${selectedDate ? 'text-[var(--dashboard-text)]' : 'text-transparent'}`}
          />
          <CalendarDays
            className="pointer-events-none absolute right-3 h-4 w-4 text-[var(--dashboard-muted)]"
            aria-hidden="true"
          />
        </label>

        <div className="flex items-center gap-1.5" aria-label="Header tools">
          <a
            href="mailto:support@pesaby.co.ke?subject=Pesaby%20dashboard%20support"
            aria-label="Contact support"
            title="Contact support"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] transition-colors hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2"
          >
            <Headphones className="h-[18px] w-[18px]" />
          </a>
          <ThemeSwitcher circular />
          <button
            type="button"
            aria-label={
              unreadNotificationCount
                ? `${unreadNotificationCount} unread notifications`
                : 'Notifications'
            }
            title="Notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] transition-colors hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--dashboard-danger)] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[var(--dashboard-surface)]">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="group flex h-11 items-center gap-2.5 rounded-xl px-1.5 py-0.5 text-left text-[var(--dashboard-text)] transition-colors hover:bg-[var(--dashboard-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2 sm:pr-2.5"
              aria-label="Open account menu"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent)] text-xs font-extrabold text-[var(--dashboard-accent-cta-ink)] ring-2 ring-[var(--dashboard-surface)]">
                {userImage && !avatarFailed ? (
                  <Image
                    src={userImage}
                    alt=""
                    fill
                    sizes="40px"
                    unoptimized
                    className="object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span aria-hidden="true">{initials || 'A'}</span>
                )}
              </div>
              <span className="hidden min-w-0 max-w-[150px] leading-tight md:block">
                <span className="block truncate text-sm font-bold">
                  {userName ?? 'Account'}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-[var(--dashboard-muted)]">
                  {roleTitle}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          >
            <DropdownMenuLabel className="px-3 py-3 font-normal">
              <p className="truncate text-sm font-semibold text-foreground">
                {userName || 'Pesaby account'}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.07em] text-foreground">
                <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                {roleTitle}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onSelect={() => router.push('/dashboard/admin/profile')}
              className="gap-3 rounded-lg px-3 py-2.5 text-muted-foreground focus:bg-muted focus:text-foreground"
            >
              <UserRound className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => router.push('/dashboard/settings')}
              className="gap-3 rounded-lg px-3 py-2.5 text-muted-foreground focus:bg-muted focus:text-foreground"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onSelect={handleSignOut}
              className="gap-3 rounded-lg px-3 py-2.5 text-muted-foreground focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/30 dark:focus:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
