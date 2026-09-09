import 'server-only';

import { createPublicKey, X509Certificate } from 'node:crypto';

type PemKind = 'certificate' | 'privateKey';

/**
 * Normalizes a PEM environment variable without ever logging or serializing it.
 * Vercel may provide a real multiline value while local tooling often uses the
 * same PEM as one line with literal `\\n` sequences.
 */
function normalizePem(value: string | undefined, kind: PemKind) {
  if (!value) return null;

  let pem = value.trim();
  if (
    pem.length >= 2 &&
    ((pem.startsWith('"') && pem.endsWith('"')) ||
      (pem.startsWith("'") && pem.endsWith("'")))
  ) {
    pem = pem.slice(1, -1).trim();
  }

  // Preserve actual newlines, while translating escaped newlines from a
  // single-line environment variable into a normal PEM document.
  pem = pem.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').trim();

  if (kind === 'certificate') {
    return /^-----BEGIN CERTIFICATE-----\s+[\s\S]+\s+-----END CERTIFICATE-----$/.test(pem)
      ? pem
      : null;
  }

  const match = pem.match(/^-----BEGIN ([A-Z0-9 ]*PRIVATE KEY)-----\s+/);
  if (!match) return null;
  const endMarker = `-----END ${match[1]}-----`;
  return pem.endsWith(endMarker) ? pem : null;
}

/** Public certificate only. Safe to return to QZ Tray clients when configured. */
export function normalizedQzCertificate() {
  return normalizePem(process.env.QZ_CERTIFICATE, 'certificate');
}

/** Server-only signing material. Never return this value from a route. */
export function normalizedQzPrivateKey() {
  return normalizePem(process.env.QZ_PRIVATE_KEY, 'privateKey');
}

/** Server-only status check that deliberately contains no secret material. */
export function qzSigningConfiguration() {
  const certificate = normalizedQzCertificate();
  const privateKey = normalizedQzPrivateKey();
  const certificateConfigured = Boolean(certificate);
  const privateKeyConfigured = Boolean(privateKey);
  let keyPairMatches = false;

  if (certificate && privateKey) {
    try {
      const certificatePublicKey = new X509Certificate(certificate).publicKey.export({
        type: 'spki',
        format: 'der',
      });
      const privateKeyPublicKey = createPublicKey(privateKey).export({
        type: 'spki',
        format: 'der',
      });
      keyPairMatches = certificatePublicKey.equals(privateKeyPublicKey);
    } catch {
      keyPairMatches = false;
    }
  }

  return { certificateConfigured, privateKeyConfigured, keyPairMatches };
}
