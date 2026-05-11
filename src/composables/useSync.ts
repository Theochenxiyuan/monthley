import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useSettingsStore } from '@/stores/settings';
import { useTimelineStore } from '@/stores/timeline';
import { dataService, type ExportData } from '@/services/dataService';
import { syncService } from '@/services/syncService';

const SYNC_TIME_KEY = 'lastSyncedAt';
const CLOUD_UPDATED_KEY = 'cloudUpdatedAt';

const isSyncing = ref(false);
const lastSyncedAt = ref<Date | null>(loadSavedDate(SYNC_TIME_KEY));
const cloudUpdatedAt = ref<Date | null>(loadSavedDate(CLOUD_UPDATED_KEY));
let uploadTimer: ReturnType<typeof setTimeout> | null = null;
let autoUploadStarted = false;

function loadSavedDate(key: string): Date | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try {
    const date = new Date(saved);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function saveDate(key: string, date: Date | null) {
  if (date) {
    localStorage.setItem(key, date.toISOString());
  } else {
    localStorage.removeItem(key);
  }
}

function recordSyncTime() {
  lastSyncedAt.value = new Date();
  saveDate(SYNC_TIME_KEY, lastSyncedAt.value);
}

function recordCloudUpdateTime(value: string | null) {
  const date = value ? new Date(value) : null;
  cloudUpdatedAt.value = date && !Number.isNaN(date.getTime()) ? date : null;
  saveDate(CLOUD_UPDATED_KEY, cloudUpdatedAt.value);
}

export function useSync() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const timelineStore = useTimelineStore();

  function getSyncErrorMessage(error: unknown): string {
    const errorRecord = error && typeof error === 'object' ? error as Record<string, unknown> : null;
    const status = errorRecord?.status ?? errorRecord?.statusCode;
    const statusCode = typeof status === 'number' ? status : typeof status === 'string' ? Number(status) : null;
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('not configured')) return t('sync.errorNotConfigured');
    if (statusCode === 401 || statusCode === 403 || message.includes('permission') || message.includes('jwt')) {
      return t('sync.errorPermission');
    }
    if (statusCode === 413 || message.includes('too large') || message.includes('payload')) {
      return t('sync.errorPayloadTooLarge');
    }
    if (name === 'OperationError' || message.includes('decrypt') || message.includes('parse') || message.includes('schema')) {
      return t('sync.errorInvalidData');
    }
    if (name === 'TypeError' || message.includes('failed to fetch') || message.includes('network')) {
      return t('sync.errorNetwork');
    }

    return t('sync.syncFailed');
  }

  function applyTimelineData(data: ExportData) {
    timelineStore.months = data.months;
    timelineStore.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : null;
    timelineStore.clearEmptyMonths();
    timelineStore.addCurrentMonthIfMissing();
    timelineStore.saveLocal();
  }

  function getLocalData(): ExportData {
    return dataService.exportDataFromState(timelineStore);
  }

  function scheduleUpload() {
    if (!settingsStore.syncKey) return;
    if (uploadTimer) clearTimeout(uploadTimer);
    uploadTimer = setTimeout(() => {
      push().catch(() => {
        // Silent fail on auto-upload
      });
    }, 3000);
  }

  async function pull(): Promise<boolean> {
    const syncKey = settingsStore.syncKey;
    if (!syncKey) return false;
    if (isSyncing.value) return false;

    isSyncing.value = true;
    try {
      if (uploadTimer) {
        clearTimeout(uploadTimer);
        uploadTimer = null;
      }

      const remote = await syncService.download(syncKey);
      if (!remote) {
        const localData = getLocalData();
        await syncService.upload(syncKey, localData);
        recordCloudUpdateTime(localData.lastUpdated);
        recordSyncTime();
        return false;
      }

      const remoteData = dataService.validateTimelineData(remote);
      const localTime = timelineStore.lastUpdated?.getTime() || 0;
      const remoteTime = remoteData.lastUpdated ? new Date(remoteData.lastUpdated).getTime() : 0;

      recordCloudUpdateTime(remoteData.lastUpdated);

      if (!remoteData.lastUpdated || localTime > remoteTime) {
        const localData = getLocalData();
        await syncService.upload(syncKey, localData);
        recordCloudUpdateTime(localData.lastUpdated);
        recordSyncTime();
        return false;
      }

      if (remoteTime > localTime) {
        applyTimelineData(remoteData);
        recordSyncTime();
        ElMessage.success(t('sync.restoredFromCloud'));
        return true;
      }

      recordSyncTime();
      return false;
    } finally {
      isSyncing.value = false;
    }
  }

  async function push(): Promise<void> {
    const syncKey = settingsStore.syncKey;
    if (!syncKey) return;
    if (isSyncing.value) return;

    isSyncing.value = true;
    try {
      const localData = getLocalData();
      await syncService.upload(syncKey, localData);
      recordCloudUpdateTime(localData.lastUpdated);
      recordSyncTime();
    } catch (err) {
      console.error('Sync upload failed:', err);
      throw err;
    } finally {
      isSyncing.value = false;
    }
  }

  async function refreshCloudUpdatedAt(): Promise<void> {
    const syncKey = settingsStore.syncKey;
    if (!syncKey) return;

    const remote = await syncService.download(syncKey);
    if (!remote) {
      recordCloudUpdateTime(null);
      return;
    }

    const remoteData = dataService.validateTimelineData(remote);
    recordCloudUpdateTime(remoteData.lastUpdated);
  }

  async function init(): Promise<void> {
    if (!settingsStore.syncKey) return;
    await pull();
  }

  if (!autoUploadStarted) {
    autoUploadStarted = true;

    watch(
      () => timelineStore.lastUpdated,
      () => {
        if (!settingsStore.syncKey) return;
        if (isSyncing.value) return;
        scheduleUpload();
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
    } catch (error) {
      ElMessage.error(getSyncErrorMessage(error));
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
    cloudUpdatedAt,
    init,
    pull,
    push,
    refreshCloudUpdatedAt,
    manualSync,
    getSyncErrorMessage,
    generateSyncKey,
  };
}
