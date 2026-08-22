'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  removeOwnAvatar,
  updateOwnProfile,
  type getOwnProfile,
} from '@/app/actions/profile';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ProfileData = Awaited<ReturnType<typeof getOwnProfile>>;

function roleName(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ProfileSettings({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(profile.account.image ?? '');
  const [uploading, setUploading] = useState(false);
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const initials = profile.account.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    if (verificationCooldown <= 0) return;
    const timer = window.setInterval(
      () => setVerificationCooldown((value) => Math.max(0, value - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [verificationCooldown]);

  async function sendVerification() {
    setVerificationSending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email: profile.account.email,
        callbackURL: '/dashboard?verified=1',
      });
      if (result.error)
        throw new Error(result.error.message || 'Could not send verification');
      setVerificationCooldown(60);
      toast.success(
        'Verification email sent. Check your inbox and spam folder.'
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not send verification email'
      );
    } finally {
      setVerificationSending(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body,
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !result.url)
        throw new Error(result.error || 'Upload failed');
      setImage(result.url);
      toast.success(
        'Photo uploaded. Save your profile to use it in the header.'
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not upload photo'
      );
    } finally {
      setUploading(false);
    }
  }

  function save(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOwnProfile({
          name: String(formData.get('name')),
          phone: String(formData.get('phone') || ''),
          image: image || null,
        });
        toast.success('Profile updated');
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Could not update profile'
        );
      }
    });
  }

  function removeAvatar() {
    startTransition(async () => {
      try {
        await removeOwnAvatar();
        setImage('');
        toast.success('Profile photo removed');
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Could not remove photo'
        );
      }
    });
  }

  async function changePassword(formData: FormData) {
    const currentPassword = String(formData.get('currentPassword') || '');
    const newPassword = String(formData.get('newPassword') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    startTransition(async () => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error)
        toast.error(result.error.message || 'Could not change password');
      else {
        toast.success('Password changed');
        (
          document.getElementById('password-form') as HTMLFormElement | null
        )?.reset();
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
          <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">Profile details</h2>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
              This information identifies you throughout the workspace.
            </p>
          </div>
          <form action={save} className="space-y-6 p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-xl font-bold text-[var(--dashboard-accent)]">
                {image ? (
                  <Image
                    src={image}
                    alt="Profile preview"
                    fill
                    sizes="96px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span>{initials || 'U'}</span>
                )}
              </div>
              <div>
                <h3 className="font-semibold">Profile photo</h3>
                <p className="mt-1 max-w-md text-sm text-[var(--dashboard-muted)]">
                  Upload a square JPG, PNG or WebP. Your photo appears in the
                  top header; remove it anytime to use initials instead.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) =>
                      void uploadAvatar(event.target.files?.[0])
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading || pending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {uploading
                      ? 'Uploading…'
                      : image
                        ? 'Change photo'
                        : 'Upload photo'}
                  </Button>
                  {image && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={removeAvatar}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={profile.account.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">Phone number</Label>
                <Input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  maxLength={30}
                  defaultValue={
                    profile.account.phone ?? profile.staff?.phone ?? ''
                  }
                  placeholder="e.g. +254 712 345 678"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="profile-email"
                  value={profile.account.email}
                  readOnly
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-[var(--dashboard-muted)]">
                Email changes require account verification and are managed
                securely by an administrator.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={pending || uploading}
                className="bg-[var(--dashboard-accent-cta)] font-bold text-[var(--dashboard-accent-cta-ink)] hover:bg-[var(--dashboard-accent-cta-hover)]"
              >
                {pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save profile
              </Button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
          <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">Password and security</h2>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
              Update your password and sign out other active sessions.
            </p>
          </div>
          <form
            id="password-form"
            action={changePassword}
            className="grid gap-4 p-5 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="outline" disabled={pending}>
                <KeyRound className="mr-2 h-4 w-4" />
                Change password
              </Button>
            </div>
          </form>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-[var(--dashboard-muted)]">
                Workspace role
              </p>
              <p className="font-semibold">{roleName(profile.role)}</p>
            </div>
          </div>
          <div className="mt-5 space-y-4 border-t border-[var(--dashboard-border)] pt-5">
            <Info
              icon={Building2}
              label="Department"
              value={profile.staff?.department || 'Not assigned'}
            />
            <Info
              icon={MapPin}
              label="Locations"
              value={
                profile.locations.length
                  ? profile.locations.map((item) => item.name).join(', ')
                  : 'Organization-wide access'
              }
            />
            <Info
              icon={Phone}
              label="Account status"
              value={
                profile.account.status === 'active'
                  ? 'Active'
                  : roleName(profile.account.status)
              }
            />
          </div>
        </section>
        <section className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-[var(--dashboard-accent)]" />
            <h2 className="text-base font-semibold leading-5">Account information</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[var(--dashboard-muted)]">Email verified</dt>
              <dd
                className={
                  profile.account.emailVerified
                    ? 'font-medium text-[var(--dashboard-success)]'
                    : 'font-medium text-[var(--dashboard-accent)]'
                }
              >
                {profile.account.emailVerified ? 'Verified' : 'Pending'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--dashboard-muted)]">Member since</dt>
              <dd className="font-medium">
                {new Date(profile.account.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
          {!profile.account.emailVerified && (
            <div className="mt-4 border-t border-[var(--dashboard-border)] pt-4">
              <p className="text-xs leading-5 text-[var(--dashboard-muted)]">
                Verify {profile.account.email} to secure your account and
                receive important account emails.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3 w-full bg-[var(--dashboard-accent-cta)] font-bold text-[var(--dashboard-accent-cta-ink)] hover:bg-[var(--dashboard-accent-cta-hover)]"
                disabled={verificationSending || verificationCooldown > 0}
                onClick={() => void sendVerification()}
              >
                {verificationSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {verificationSending
                  ? 'Sending…'
                  : verificationCooldown > 0
                    ? `Resend in ${verificationCooldown}s`
                    : 'Send verification email'}
              </Button>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dashboard-muted)]" />
      <div>
        <p className="text-xs text-[var(--dashboard-muted)]">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
