'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  PackagePlus,
  Plus,
  ReceiptText,
  ShoppingCart,
  UserPlus,
  Settings,
} from 'lucide-react';
import { switchActiveOrganization } from '@/app/actions/workspace';
import { PesabyLogoMark } from '@/components/brand/pesaby-logo';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { PermissionEnum } from '@/lib/types/permissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/lib/context/workspace-context';
import { getProductTerminology } from '@/lib/products/terminology';

interface AppNavbarProps {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  organizationName: string;
  organizationId: string;
  availableOrganizations: Array<{ id: string; name: string; businessType: string }>;
  branchName?: string | null;
  workspaceDescription: string;
  onOpenSidebar?: () => void;
  role?: string;
  permissions: readonly PermissionEnum[];
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
  organizationId,
  availableOrganizations,
  branchName,
  workspaceDescription,
  onOpenSidebar,
  role,
  permissions,
}: AppNavbarProps) {
  const router = useRouter();
  const { config } = useWorkspace();
  const productTerms = getProductTerminology(
    config?.businessType,
    config?.businessCategory
  );
  const saleLabel = config?.businessCategory === 'liquor_shop'
    ? 'New store sale'
    : config?.businessCategory === 'cafe'
      ? 'New café order'
    : productTerms.title === 'Medicines'
      ? 'New pharmacy sale'
      : 'Quick sale';
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const quickCreateRef = useRef<HTMLDivElement>(null);
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
  const quickActions = [
    permissions.includes(PermissionEnum.POS_SELL) ||
    permissions.includes(PermissionEnum.SALE_CREATE)
      ? { label: saleLabel, href: '/dashboard/pos', icon: ShoppingCart }
      : null,
    permissions.includes(PermissionEnum.PRODUCT_CREATE)
      ? {
          label: productTerms.add,
          href: '/dashboard/products/new',
          icon: PackagePlus,
        }
      : null,
    permissions.includes(PermissionEnum.EXPENSE_MANAGE)
      ? {
          label: 'Record expense',
          href: '/dashboard/expenses?new=1',
          icon: ReceiptText,
        }
      : null,
    permissions.includes(PermissionEnum.CUSTOMER_CREATE)
      ? {
          label: 'Add customer',
          href: '/dashboard/customers/new',
          icon: UserPlus,
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    href: string;
    icon: typeof Plus;
  }>;

  useEffect(() => {
    if (!quickCreateOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!quickCreateRef.current?.contains(event.target as Node)) {
        setQuickCreateOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQuickCreateOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [quickCreateOpen]);

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
    <header className="dashboard-navbar z-30 flex h-[68px] shrink-0 items-center justify-between gap-4 border-b px-4 sm:px-5 lg:px-6">
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
            <p className="truncate text-sm font-bold uppercase text-[var(--dashboard-text)]">
              {organizationName}
              {branchName && branchName !== organizationName ? ` · ${branchName}` : ''}
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

      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        {quickActions.length > 0 && (
          <div ref={quickCreateRef} className="relative">
            <button
              type="button"
              aria-expanded={quickCreateOpen}
              aria-haspopup="menu"
              onClick={() => setQuickCreateOpen((open) => !open)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--dashboard-accent-cta)] px-3 text-xs font-bold text-[var(--dashboard-accent-cta-ink)] transition-colors hover:bg-[var(--dashboard-accent-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick create</span>
              <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
            </button>
            {quickCreateOpen && (
              <div
                role="menu"
                className="quick-create-menu absolute right-0 top-[calc(100%+0.6rem)] z-50 w-56 rounded-xl border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-surface)] p-2 text-[var(--dashboard-text)] shadow-[0_16px_36px_rgb(0_0_0_/_0.3)]"
              >
                <p className="px-3 py-2 text-xs font-semibold text-[var(--dashboard-muted)]">
                  Create new
                </p>
                <div className="my-1 h-px bg-[var(--dashboard-border)]" />
                {quickActions.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setQuickCreateOpen(false)}
                    className="quick-create-item flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--dashboard-text)] outline-none transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[var(--dashboard-accent)]" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <ThemeSwitcher circular />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="group flex h-12 shrink-0 items-center gap-2 rounded-xl border border-[#c98a00] bg-white px-1.5 text-left text-[var(--dashboard-text)] shadow-sm transition-colors hover:border-[#a66f00] hover:bg-[#fffaf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a800] focus-visible:ring-offset-2 dark:bg-[var(--dashboard-surface)] dark:hover:bg-white/5 md:w-[218px]"
              aria-label="Open account menu"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f1cd61] bg-[var(--dashboard-accent-soft)] text-xs font-extrabold text-[var(--dashboard-accent-strong)]">
                {userImage && !avatarFailed ? (
                  <Image
                    src={userImage}
                    alt=""
                    fill
                    sizes="36px"
                    quality={50}
                    priority
                    className="object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span aria-hidden="true">{initials || 'A'}</span>
                )}
              </div>
              <span className="hidden min-w-0 flex-1 leading-tight md:block">
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
            sideOffset={8}
            className="z-[100] w-56 overflow-hidden rounded-md border border-[#e3e7ec] !bg-white p-0 text-[#0f172a] shadow-[0_10px_28px_rgba(16,24,40,0.16)] dark:border-[#262626] dark:!bg-[#0d0d0d] dark:text-[#fafafa]"
          >
            <DropdownMenuItem
              onSelect={() => router.push('/dashboard/profile')}
              className="mx-3 mb-3 mt-3 flex h-10 cursor-pointer justify-center rounded-md bg-[#fbbc04] px-3 text-sm font-semibold text-[#201600] focus:bg-[#e9ae00] focus:text-[#201600]"
            >
              My profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#e3e7ec] dark:bg-[#262626]" />
            {availableOrganizations.length > 1 && <>
              <DropdownMenuLabel className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[#667085] dark:text-[#a3a3a3]">Workspaces</DropdownMenuLabel>
              {availableOrganizations.map((item) => <DropdownMenuItem key={item.id} disabled={item.id === organizationId} onSelect={() => { if (item.id !== organizationId) void switchActiveOrganization(item.id) }} className="h-10 gap-3 rounded-none px-4 text-[#526078] focus:bg-[#f7f8fa] focus:text-[#0f172a] dark:text-[#a3a3a3] dark:focus:bg-[#1a1a1a] dark:focus:text-[#fafafa]"><Building2 className="h-4 w-4" /><span className="min-w-0 flex-1 truncate">{item.name}</span>{item.id === organizationId && <span className="text-[10px] font-semibold">Current</span>}</DropdownMenuItem>)}
              <DropdownMenuSeparator className="bg-[#e3e7ec] dark:bg-[#262626]" />
            </>}
            <DropdownMenuItem
              onSelect={() => router.push('/dashboard/settings')}
              disabled={!permissions.includes(PermissionEnum.SETTINGS_VIEW)}
              className={`${permissions.includes(PermissionEnum.SETTINGS_VIEW) ? '' : 'hidden'} h-11 gap-3 rounded-none px-4 text-[#526078] focus:bg-[#f7f8fa] focus:text-[#0f172a] dark:text-[#a3a3a3] dark:focus:bg-[#1a1a1a] dark:focus:text-[#fafafa]`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            {permissions.includes(PermissionEnum.STAFF_MANAGE) && (
              <DropdownMenuItem
                onSelect={() => router.push('/dashboard/staff')}
                className="h-11 gap-3 rounded-none px-4 text-[#526078] focus:bg-[#f7f8fa] focus:text-[#0f172a] dark:text-[#a3a3a3] dark:focus:bg-[#1a1a1a] dark:focus:text-[#fafafa]"
              >
                <UserPlus className="h-4 w-4" />
                <span>Staff &amp; access</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-[#e3e7ec] dark:bg-[#262626]" />
            <DropdownMenuItem
              onSelect={handleSignOut}
              className="h-11 gap-3 rounded-none px-4 text-[#526078] focus:bg-red-50 focus:text-red-600 dark:text-[#a3a3a3] dark:focus:bg-red-950/30 dark:focus:text-red-300"
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
