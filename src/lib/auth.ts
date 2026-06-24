const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-1234567890-ultraplex';

// Helper to base64url encode/decode
function base64urlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Generate a signed session JWT token using Web Crypto API.
 */
export async function createSessionToken(payload: { userId: string; email: string; name: string; isSuperAdmin?: boolean }, expiryDays = 7): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;
  const fullPayload = { ...payload, exp };

  const textHeader = JSON.stringify(header);
  const textPayload = JSON.stringify(fullPayload);
  const encodedHeader = base64urlEncode(textHeader);
  const encodedPayload = base64urlEncode(textPayload);
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(JWT_SECRET);
  
  // Use crypto.subtle (Web Crypto API) which is available globally in Next.js
  const cryptoSubtle = typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : null;
  if (!cryptoSubtle) {
    throw new Error('Web Crypto API is not supported in this environment.');
  }

  const key = await cryptoSubtle.importKey(
    'raw',
    secretKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await cryptoSubtle.sign(
    'HMAC',
    key,
    encoder.encode(dataToSign)
  );

  // Convert buffer to base64url
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureString = String.fromCharCode(...signatureArray);
  const signature = base64urlEncode(signatureString);

  return `${dataToSign}.${signature}`;
}

/**
 * Verify a signed session JWT token using Web Crypto API.
 */
export async function verifySessionToken(token: string): Promise<{ userId: string; email: string; name: string; isSuperAdmin?: boolean } | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(JWT_SECRET);
  
  const cryptoSubtle = typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : null;
  if (!cryptoSubtle) {
    throw new Error('Web Crypto API is not supported in this environment.');
  }

  try {
    const key = await cryptoSubtle.importKey(
      'raw',
      secretKeyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert base64url signature back to array buffer
    const signatureString = base64urlDecode(signature);
    const signatureBuffer = new Uint8Array(signatureString.length);
    for (let i = 0; i < signatureString.length; i++) {
      signatureBuffer[i] = signatureString.charCodeAt(i);
    }

    const isValid = await cryptoSubtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(dataToSign)
    );

    if (!isValid) return null;
  } catch (e) {
    console.error('Error verifying token via Web Crypto:', e);
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}
