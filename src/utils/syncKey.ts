const SYNC_KEY_PATTERN = /^[a-zA-Z0-9]{8,32}$/;
const SYNC_KEY_QR_PREFIX = 'monthley-sync-key:';

export function isValidSyncKey(value: unknown): value is string {
  return typeof value === 'string' && SYNC_KEY_PATTERN.test(value);
}

export function encodeSyncKeyQrValue(syncKey: string): string {
  return `${SYNC_KEY_QR_PREFIX}${syncKey}`;
}

export function parseSyncKeyQrValue(value: string): string | null {
  if (!value.startsWith(SYNC_KEY_QR_PREFIX)) return null;

  const syncKey = value.slice(SYNC_KEY_QR_PREFIX.length);
  return isValidSyncKey(syncKey) ? syncKey : null;
}
