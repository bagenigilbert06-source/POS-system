import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { AuthorizationError, requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'

const MAX_BYTES = 5 * 1024 * 1024

function isJpeg(bytes: Uint8Array) { return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }
function isPng(bytes: Uint8Array) { return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]) }
function isWebp(bytes: Uint8Array) { return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP' }

export async function POST(request: Request) {
  try { await requirePermission(PermissionEnum.PRODUCT_EDIT) } catch (error) { return NextResponse.json({ error: error instanceof AuthorizationError ? error.message : 'Unauthorized' }, { status: 403 }) }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image file' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image is too large. Choose an image smaller than 5 MB.' }, { status: 413 })
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!isJpeg(bytes) && !isPng(bytes) && !isWebp(bytes)) return NextResponse.json({ error: 'This file type is not supported. Upload JPG, PNG or WebP.' }, { status: 415 })
  const extension = isWebp(bytes) ? 'webp' : isPng(bytes) ? 'png' : 'jpg'
  const filename = `${crypto.randomUUID()}.${extension}`
  const directory = path.join(process.cwd(), 'public', 'uploads', 'products')
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, filename), bytes, { flag: 'wx' })
  return NextResponse.json({ url: `/uploads/products/${filename}`, size: bytes.byteLength, contentType: file.type || 'image/webp' })
}
