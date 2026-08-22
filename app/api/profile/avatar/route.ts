import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import {
  AuthorizationError,
  requireFullAuthentication,
} from '@/lib/auth/authorization';

const MAX_BYTES = 3 * 1024 * 1024;
const isJpeg = (bytes: Uint8Array) =>
  bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
const isPng = (bytes: Uint8Array) =>
  bytes
    .slice(0, 8)
    .every(
      (value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]
    );
const isWebp = (bytes: Uint8Array) =>
  String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
  String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';

export async function POST(request: Request) {
  try {
    const authorization = await requireFullAuthentication();
    const file = (await request.formData()).get('file');
    if (!(file instanceof File))
      return NextResponse.json(
        { error: 'Choose a profile image' },
        { status: 400 }
      );
    if (file.size > MAX_BYTES)
      return NextResponse.json(
        { error: 'Profile image must be smaller than 3 MB' },
        { status: 413 }
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isJpeg(bytes) && !isPng(bytes) && !isWebp(bytes))
      return NextResponse.json(
        { error: 'Upload a JPG, PNG, or WebP image' },
        { status: 415 }
      );
    const extension = isWebp(bytes) ? 'webp' : isPng(bytes) ? 'png' : 'jpg';
    const filename = `${authorization.userId}-${crypto.randomUUID()}.${extension}`;
    const contentType =
      extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`profiles/${filename}`, Buffer.from(bytes), {
        access: 'public',
        contentType,
        addRandomSuffix: false,
      });
      return NextResponse.json({ url: blob.url });
    }
    if (process.env.VERCEL)
      return NextResponse.json(
        { error: 'Profile image storage is not configured' },
        { status: 503 }
      );
    const directory = path.join(process.cwd(), 'public', 'uploads', 'profile');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes, { flag: 'wx' });
    return NextResponse.json({ url: `/uploads/profile/${filename}` });
  } catch (error) {
    const forbidden = error instanceof AuthorizationError;
    return NextResponse.json(
      { error: forbidden ? error.message : 'Profile image upload failed' },
      { status: forbidden ? 403 : 500 }
    );
  }
}
