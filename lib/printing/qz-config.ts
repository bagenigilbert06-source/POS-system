/** Server-only QZ configuration checks. Never return certificate/key material. */
export function qzSigningConfiguration() {
  const certificateConfigured = Boolean(process.env.QZ_CERTIFICATE?.replace(/\\n/g, '\n').trim());
  const privateKeyConfigured = Boolean(process.env.QZ_PRIVATE_KEY?.replace(/\\n/g, '\n').trim());
  return {
    certificateConfigured,
    privateKeyConfigured,
    pairReady: certificateConfigured && privateKeyConfigured,
    unsignedDevelopment: process.env.NODE_ENV === 'development' && process.env.QZ_ALLOW_UNSIGNED_DEVELOPMENT === 'true',
  };
}
