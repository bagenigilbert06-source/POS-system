'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2, UserRound } from 'lucide-react';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';

export function StaffPhotoField({
  name,
  value,
  onChange,
  variant = 'default',
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  variant?: 'default' | 'employee-form';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file?: File) {
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
        throw new Error(result.error || 'Photo upload failed');
      onChange(result.url);
      notify.success('Employee photo uploaded');
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : 'Could not upload employee photo'
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      onChange={(event) => void upload(event.target.files?.[0])}
    />
  );

  if (variant === 'employee-form') {
    return (
      <div className="flex flex-wrap items-center gap-6">
        {fileInput}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="relative flex h-[122px] w-[122px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] transition hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-surface-subtle)] disabled:opacity-60"
        >
          {value ? (
            <Image
              src={value}
              alt={`${name || 'Employee'} preview`}
              fill
              sizes="122px"
              unoptimized
              className="object-cover"
            />
          ) : uploading ? (
            <Loader2 className="mb-2 h-5 w-5 animate-spin" />
          ) : (
            <>
              <Camera className="mb-2 h-5 w-5" />
              <span className="text-sm">Profile Photo</span>
            </>
          )}
        </button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="h-10 bg-[var(--dashboard-accent-cta)] px-4 font-semibold text-[var(--dashboard-accent-cta-ink)] hover:bg-[var(--dashboard-accent-cta-hover)]"
          >
            {uploading ? 'Uploading…' : value ? 'Change Image' : 'Add Image'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange('')}
              className="h-10 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 dark:border-white/15 dark:bg-white/[0.025]">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#fff3b5] text-lg font-extrabold text-slate-950 shadow-sm ring-1 ring-slate-200 dark:border-zinc-900 dark:ring-white/15">
        {value ? (
          <Image
            src={value}
            alt={`${name || 'Employee'} preview`}
            fill
            sizes="80px"
            unoptimized
            className="object-cover"
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <UserRound className="h-7 w-7 text-[#9a7100]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Employee photo</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          Square JPG, PNG or WebP, up to 3 MB.
        </p>
        {fileInput}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="h-8 gap-1.5"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            {uploading ? 'Uploading…' : value ? 'Change photo' : 'Add photo'}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange('')}
              className="h-8 gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
