import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import pg from 'pg'

function loadEnv() {
  const env = readFileSync('.env', 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    process.env[key] ??= rawValue.replace(/^"|"$/g, '')
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer(baseURL, child) {
  const started = Date.now()
  while (Date.now() - started < 45_000) {
    if (child.exitCode !== null) {
      throw new Error(`Next dev server exited early with code ${child.exitCode}`)
    }

    try {
      const response = await fetch(baseURL)
      if (response.status < 500) return
    } catch {
      await wait(750)
    }
  }

  throw new Error('Timed out waiting for Next dev server')
}

async function authFetch(baseURL, path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = {
    origin: baseURL,
    ...(options.headers ?? {}),
  }

  if (options.body !== undefined && options.body !== null) {
    headers['content-type'] = 'application/json'
  } else if (method === 'POST') {
    headers['content-type'] = 'application/json'
    options.body = '{}'
  }

  const response = await fetch(`${baseURL}/api/auth${path}`, {
    redirect: 'manual',
    ...options,
    headers,
  })

  let body = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  return { response, body }
}

async function cleanupTestUser(email) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase.com')
      ? { rejectUnauthorized: false }
      : undefined,
  })
  try {
    await pool.query('delete from "user" where email = $1', [email])
  } finally {
    await pool.end()
  }
}

loadEnv()

const port = process.env.AUTH_TEST_PORT ?? '3100'
const baseURL = `http://127.0.0.1:${port}`
const email = `auth-test-${Date.now()}@example.com`
const password = 'Correct-Horse-42-auth-test'

process.env.BETTER_AUTH_URL = baseURL

const server = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', port], {
  env: process.env,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})

let output = ''
server.stdout.on('data', (chunk) => {
  output += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  output += chunk.toString()
})

try {
  await waitForServer(baseURL, server)
  await cleanupTestUser(email)

  const signUp = await authFetch(baseURL, '/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ name: 'Auth Test', email, password }),
  })
  assert.equal(signUp.response.status, 200, JSON.stringify(signUp.body))
  assert.ok(signUp.response.headers.get('set-cookie')?.includes('better-auth'), 'sign-up should auto sign in')

  const signIn = await authFetch(baseURL, '/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  assert.equal(signIn.response.status, 200, JSON.stringify(signIn.body))

  const cookie = signIn.response.headers.get('set-cookie')
  assert.ok(cookie?.includes('better-auth'), 'sign-in should set Better Auth session cookies')

  const session = await authFetch(baseURL, '/get-session', {
    method: 'GET',
    headers: { cookie },
  })
  assert.equal(session.response.status, 200, JSON.stringify(session.body))
  assert.equal(session.body?.user?.email, email)

  const jwt = await authFetch(baseURL, '/token', {
    method: 'GET',
    headers: { cookie },
  })
  assert.equal(jwt.response.status, 200, JSON.stringify(jwt.body))
  assert.match(jwt.body?.token, /^[^.]+\.[^.]+\.[^.]+$/)

  const JWKS = createRemoteJWKSet(new URL(`${baseURL}/api/auth/jwks`))
  const verified = await jwtVerify(jwt.body.token, JWKS, {
    issuer: baseURL,
    audience: 'pos-api',
  })
  assert.equal(verified.payload.aud, 'pos-api')
  assert.equal(verified.payload.sub, session.body.user.id)

  const tokenPair = await fetch(`${baseURL}/api/auth-tokens`, {
    method: 'POST',
    headers: {
      origin: baseURL,
      cookie,
    },
  })
  const tokenPairBody = await tokenPair.json()
  assert.equal(tokenPair.status, 200, JSON.stringify(tokenPairBody))
  assert.match(tokenPairBody.accessToken, /^[^.]+\.[^.]+\.[^.]+$/)
  assert.equal(tokenPairBody.tokenType, 'Bearer')
  assert.equal(tokenPairBody.expiresIn, 900)
  assert.equal(tokenPairBody.user.email, email)
  assert.ok(tokenPairBody.refreshToken, 'token pair should include a refresh token')

  const verifiedAccessToken = await jwtVerify(tokenPairBody.accessToken, JWKS, {
    issuer: baseURL,
    audience: 'pos-api',
  })
  assert.equal(verifiedAccessToken.payload.sub, session.body.user.id)

  const refreshed = await fetch(`${baseURL}/api/auth-tokens`, {
    method: 'POST',
    headers: {
      origin: baseURL,
      authorization: `Bearer ${tokenPairBody.refreshToken}`,
    },
  })
  const refreshedBody = await refreshed.json()
  assert.equal(refreshed.status, 200, JSON.stringify(refreshedBody))
  assert.match(refreshedBody.accessToken, /^[^.]+\.[^.]+\.[^.]+$/)

  const badSignIn = await authFetch(baseURL, '/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'wrong-password' }),
  })
  assert.equal(badSignIn.response.status, 401, JSON.stringify(badSignIn.body))

  const signOut = await authFetch(baseURL, '/sign-out', {
    method: 'POST',
    headers: { cookie },
  })
  assert.equal(signOut.response.status, 200, JSON.stringify(signOut.body))

  const signedOutSession = await authFetch(baseURL, '/get-session', {
    method: 'GET',
    headers: { cookie: '' },
  })
  assert.equal(signedOutSession.response.status, 200, JSON.stringify(signedOutSession.body))
  assert.equal(signedOutSession.body, null)

  console.log('Auth integration test passed')
} finally {
  await cleanupTestUser(email).catch(() => {})
  if (server.exitCode === null) {
    process.kill(-server.pid, 'SIGTERM')
    await wait(1000)
  }
  if (server.exitCode === null) {
    process.kill(-server.pid, 'SIGKILL')
  }
  if (process.env.DEBUG_AUTH_TEST === '1') {
    console.log(output)
  }
  process.exitCode = process.exitCode ?? 0
}
