import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useSettingsStore } from '@/stores/settings';
import { useTimelineStore } from '@/stores/timeline';
import { dataService, type ExportData } from '@/services/dataService';
import { syncService } from '@/services/syncService';

const SYNC_TIME_KEY = 'lastSyncedAt';

const isSyncing = ref(false);
const lastSyncedAt = ref<Date | null>(loadSavedSyncTime());
let uploadTimer: ReturnType<typeof setTimeout> | null = null;
let autoUploadStarted = false;

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

function isSameTimelineData(a: ExportData, b: ExportData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useSync() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const timelineStore = useTimelineStore();

  function recordSyncTime() {
    lastSyncedAt.value = new Date();
    saveSyncTime(lastSyncedAt.value);
  }

  function applyTimelineData(data: ExportData) {
    timelineStore.months = data.months;
    timelineStore.deletedEntries = data.deletedEntries;
    timelineStore.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : null;
    timelineStore.clearEmptyMonths();
    timelineStore.addCurrentMonthIfMissing();
    timelineStore.saveLocal();
  }

  async function pull(): Promise<boolean> {
    const syncKey = settingsStore.syncKey;
    if (!syncKey) return false;

    isSyncing.value = true;
    try {
      if (uploadTimer) {
        clearTimeout(uploadTimer);
        uploadTimer = null;
      }

      const remote = await syncService.download(syncKey);
      if (!remote) {
        // Remote empty: push local data silently
        await push();
        return false;
      }

      const remoteData = dataService.validateTimelineData(remote);
      const localData = dataService.exportDataFromState(timelineStore);
      const merged = dataService.mergeTimelineData(localData, remoteData);
      const localChanged = !isSameTimelineData(localData, merged);
      const remoteChanged = !isSameTimelineData(remoteData, merged);

      if (localChanged) {
        applyTimelineData(merged);
        ElMessage.success(t('sync.restoredFromCloud'));
      }

      if (remoteChanged) {
        await syncService.upload(syncKey, merged);
      }

      recordSyncTime();
      return localChanged;
    } finally {
      isSyncing.value = false;
    }
  }

  async function push(): Promise<void> {
    const syncKey = settingsStore.syncKey;
    if (!syncKey) return;

    isSyncing.value = true;
    try {
      await syncService.upload(syncKey, dataService.exportDataFromState(timelineStore));
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

  if (!autoUploadStarted) {
    autoUploadStarted = true;

    // Auto-upload when local data changes (debounced 3s)
    watch(
      () => timelineStore.lastUpdated,
      () => {
        if (!settingsStore.syncKey) return;
        if (isSyncing.value) return;
        if (uploadTimer) clearTimeout(uploadTimer);
        uploadTimer = setTimeout(() => {
          push().catch(() => {
            // Silent fail on auto-upload
          });
        }, 3000);
      },
    );
  }

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
