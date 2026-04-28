import { supabase } from '@/lib/supabase';

const BUCKET = 'monthley-sync';
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

interface EncryptedPayload {
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(syncKey: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    TEXT_ENCODER.encode(syncKey),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(data: object, syncKey: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(syncKey, salt.buffer);
  const plaintext = TEXT_ENCODER.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertext),
  };
}

async function decrypt(payload: EncryptedPayload, syncKey: string): Promise<unknown> {
  const salt = base64ToArrayBuffer(payload.salt);
  const iv = base64ToArrayBuffer(payload.iv);
  const ciphertext = base64ToArrayBuffer(payload.ciphertext);
  const key = await deriveKey(syncKey, salt);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(TEXT_DECODER.decode(plaintext));
}

export const syncService = {
  async upload(syncKey: string, data: object): Promise<void> {
    const payload = await encrypt(data, syncKey);
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const filename = `${syncKey}.json`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, blob, { upsert: true, contentType: 'application/json' });

    if (error) throw error;
  },

  async download(syncKey: string): Promise<unknown | null> {
    const filename = `${syncKey}.json`;
    const { data, error } = await supabase.storage.from(BUCKET).download(filename);

    if (error) {
      if (error.message?.includes('Object not found') || error.name === 'StorageApiError') {
        return null;
      }
      throw error;
    }

    if (!data) return null;

    const text = await data.text();
    const payload: EncryptedPayload = JSON.parse(text);
    return decrypt(payload, syncKey);
  },
};
