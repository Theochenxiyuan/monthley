import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useSettingsStore } from '@/stores/settings';
import { useTimelineStore } from '@/stores/timeline';
import { syncService } from '@/services/syncService';
import type { TimelineState } from '@/types/models';

const SYNC_TIME_KEY = 'lastSyncedAt';

function loadSavedSyncTime(): Date | null {
  const saved = localStorage.getItem(SYNC_TIME_KEY);
  if (!saved) return null;
  try {
    const d = new Date(saved);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function saveSyncTime(date: Date | null) {
  if (date) {
    localStorage.setItem(SYNC_TIME_KEY, date.toISOString());
  } else {
    localStorage.removeItem(SYNC_TIME_KEY);
  }
}

export function useSync() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const timelineStore = useTimelineStore();

  const isSyncing = ref(false);
  const lastSyncedAt = ref<Date | null>(loadSavedSyncTime());
  let uploadTimer: ReturnType<typeof setTimeout> | null = null;

  function recordSyncTime() {
    lastSyncedAt.value = new Date();
    saveSyncTime(lastSyncedAt.value);
  }

  async function pull(): Promise<boolean> {
    const syncKey = settingsStore.syncKey;
    if (!syncKey) return false;

    isSyncing.value = true;
    try {
      const remote = await syncService.download(syncKey) as { months: TimelineState['months']; lastUpdated: string | null } | null;
      if (!remote || !remote.lastUpdated) {
        // Remote empty: push local data silently
        await push();
        return false;
      }

      const remoteTime = new Date(remote.lastUpdated).getTime();
      const localTime = timelineStore.lastUpdated?.getTime() || 0;

      if (remoteTime > localTime) {
        // Remote is newer: overwrite local
        timelineStore.months = remote.months;
        timelineStore.lastUpdated = new Date(remote.lastUpdated);
        timelineStore.clearEmptyMonths();
        timelineStore.addCurrentMonthIfMissing();
        timelineStore.saveLocal();
        recordSyncTime();
        ElMessage.success(t('sync.restoredFromCloud'));
        return true;
      } else if (localTime > remoteTime) {
        // Local is newer: push to cloud
        await push();
      } else {
        // Same time: still count as a sync
        recordSyncTime();
      }
      return false;
    } finally {
      isSyncing.value = false;
    }
  }

  async function push(): Promise<void> {
    const syncKey = settingsStore.syncKey;
    if (!syncKey) return;

    isSyncing.value = true;
    try {
      await syncService.upload(syncKey, {
        months: timelineStore.months,
        lastUpdated: timelineStore.lastUpdated?.toISOString() || new Date().toISOString(),
      });
      recordSyncTime();
    } catch (err) {
      console.error('Sync upload failed:', err);
      throw err;
    } finally {
      isSyncing.value = false;
    }
  }

  async function init(): Promise<void> {
    if (!settingsStore.syncKey) return;
    await pull();
  }

  // Auto-upload when local data changes (debounced 3s)
  watch(
    () => timelineStore.lastUpdated,
    () => {
      if (!settingsStore.syncKey) return;
      if (uploadTimer) clearTimeout(uploadTimer);
      uploadTimer = setTimeout(() => {
        push().catch(() => {
          // Silent fail on auto-upload
        });
      }, 3000);
    },
  );

  async function manualSync(): Promise<void> {
    if (!settingsStore.syncKey) {
      ElMessage.warning(t('sync.noKey'));
      return;
    }
    try {
      await pull();
      ElMessage.success(t('sync.syncSuccess'));
    } catch {
      ElMessage.error(t('sync.syncFailed'));
    }
  }

  function generateSyncKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = crypto.getRandomValues(new Uint8Array(16));
    for (let i = 0; i < 16; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result;
  }

  return {
    isSyncing,
    lastSyncedAt,
    init,
    pull,
    push,
    manualSync,
    generateSyncKey,
  };
}
