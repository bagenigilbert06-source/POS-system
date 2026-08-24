import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const MAX_BYTES = 2 * 1024 * 1024
const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
const isPng = (bytes: Uint8Array) => bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])
const isWebp = (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Sign in to upload a receipt logo.' }, { status: 401 })

  const file = (await request.formData()).get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a logo image.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Logo must be smaller than 2 MB.' }, { status: 413 })

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!isJpeg(bytes) && !isPng(bytes) && !isWebp(bytes)) {
    return NextResponse.json({ error: 'Upload a PNG, JPG, or WebP logo.' }, { status: 415 })
  }

  const extension = isWebp(bytes) ? 'webp' : isPng(bytes) ? 'png' : 'jpg'
  const directory = path.join(process.cwd(), 'public', 'uploads', 'receipt-logos')
  await mkdir(directory, { recursive: true })
  const filename = `${crypto.randomUUID()}.${extension}`
  await writeFile(path.join(directory, filename), bytes, { flag: 'wx' })

  return NextResponse.json({ url: `/uploads/receipt-logos/${filename}` })
}
