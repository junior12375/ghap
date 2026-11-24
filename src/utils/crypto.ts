/**
 * Enterprise Web Cryptography Engine
 * Implements FIPS-compliant AES-GCM 256-bit encryption with PBKDF2 key derivation
 * and SHA-256 cryptographic integrity hashing for corporate document security.
 */

import { EncryptedDocumentPackage, PermitType } from '../types/permit';

const PBKDF2_ITERATIONS = 100000;
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM
const SALT_LENGTH = 16;

/** Convert an ArrayBuffer or Uint8Array to a hex string */
export function bufToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Convert a hex string to Uint8Array */
export function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/** Convert ArrayBuffer or Uint8Array to Base64 */
export function bufToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/** Convert Base64 to ArrayBuffer */
export function base64ToBuf(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/** Compute SHA-256 digital digest of any string or object */
export async function computeSha256Digest(data: unknown): Promise<string> {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufToHex(hashBuffer);
}

/** Derive AES-GCM 256 key from passphrase and salt using PBKDF2 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a document payload with AES-GCM 256 and attach SHA-256 integrity seal
 */
export async function encryptDocument<T>(
  data: T,
  passphrase: string,
  meta: { submissionId: string; formType: PermitType; workOrder?: string; location?: string; status?: string }
): Promise<EncryptedDocumentPackage> {
  const plaintext = JSON.stringify(data);
  const sha256Hash = await computeSha256Digest(plaintext);

  // Generate cryptographically secure salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(passphrase, salt);
  const encoder = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoder.encode(plaintext)
  );

  return {
    version: '1.0',
    algorithm: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    saltHex: bufToHex(salt),
    ivHex: bufToHex(iv),
    ciphertextBase64: bufToBase64(ciphertextBuffer),
    sha256Hash,
    submissionId: meta.submissionId,
    formType: meta.formType,
    createdAt: new Date().toISOString(),
    metadataSummary: {
      workOrder: meta.workOrder || 'N/A',
      location: meta.location || 'N/A',
      status: meta.status || 'Active',
    },
  };
}

/**
 * Decrypt a document payload and verify cryptographic integrity
 */
export async function decryptDocument<T>(
  encryptedPkg: EncryptedDocumentPackage,
  passphrase: string
): Promise<{ data: T; verified: boolean }> {
  const salt = hexToBuf(encryptedPkg.saltHex);
  const iv = hexToBuf(encryptedPkg.ivHex);
  const ciphertext = base64ToBuf(encryptedPkg.ciphertextBase64);

  const key = await deriveKey(passphrase, salt);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  const plaintext = decoder.decode(decryptedBuffer);

  // Verify SHA-256 hash
  const computedHash = await computeSha256Digest(plaintext);
  const verified = computedHash === encryptedPkg.sha256Hash;

  if (!verified) {
    throw new Error('Integrity Check Failed: SHA-256 hash mismatch! Document may have been tampered with.');
  }

  return {
    data: JSON.parse(plaintext) as T,
    verified,
  };
}

/** Default corporate session encryption key management */
const VAULT_SESSION_KEY = 'ghacem_crypto_session_passphrase';

export function getStoredVaultPassphrase(): string {
  try {
    return sessionStorage.getItem(VAULT_SESSION_KEY) || localStorage.getItem(VAULT_SESSION_KEY) || 'GHACEM-SECURITY-KEY-2026';
  } catch {
    return 'GHACEM-SECURITY-KEY-2026';
  }
}

export function saveStoredVaultPassphrase(passphrase: string, remember: boolean): void {
  try {
    sessionStorage.setItem(VAULT_SESSION_KEY, passphrase);
    if (remember) {
      localStorage.setItem(VAULT_SESSION_KEY, passphrase);
    } else {
      localStorage.removeItem(VAULT_SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to store encryption key:', e);
  }
}
