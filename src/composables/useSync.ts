import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useSettingsStore } from '@/stores/settings';
import { useTimelineStore } from '@/stores/timeline';
import { dataService, type ExportData, type MergeConflict } from '@/services/dataService';
import { syncService } from '@/services/syncService';

const SYNC_TIME_KEY = 'lastSyncedAt';
const CLOUD_UPDATED_KEY = 'cloudUpdatedAt';

const isSyncing = ref(false);
const lastSyncedAt = ref<Date | null>(loadSavedSyncTime());
const cloudUpdatedAt = ref<Date | null>(loadSavedCloudUpdateTime());
let uploadTimer: ReturnType<typeof setTimeout> | null = null;
let autoUploadStarted = false;

function loadSavedDate(key: string): Date | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try {
    const d = new Date(saved);
    return isNaN(d.getTime()) ? null : d;
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

function loadSavedSyncTime(): Date | null {
  return loadSavedDate(SYNC_TIME_KEY);
}

function loadSavedCloudUpdateTime(): Date | null {
  return loadSavedDate(CLOUD_UPDATED_KEY);
}

function saveSyncTime(date: Date | null) {
  saveDate(SYNC_TIME_KEY, date);
}

function recordCloudUpdateTime(value: string | null) {
  const date = value ? new Date(value) : null;
  cloudUpdatedAt.value = date && !Number.isNaN(date.getTime()) ? date : null;
  saveDate(CLOUD_UPDATED_KEY, cloudUpdatedAt.value);
}

function isSameTimelineData(a: ExportData, b: ExportData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function cloneTimelineData(data: ExportData): ExportData {
  return dataService.cloneTimelineData(data);
}

function dedupeConflicts(conflicts: MergeConflict[]): MergeConflict[] {
  return [...new Map(conflicts.map((conflict) => [`${conflict.type}:${conflict.entryId}`, conflict])).values()];
}

function countEntries(data: ExportData): number {
  return data.months.reduce((total, month) => total + month.entries.length, 0);
}

function summarizeTimelineData(data: ExportData) {
  return {
    schemaVersion: data.schemaVersion,
    months: data.months.length,
    entries: countEntries(data),
    deletedEntries: Object.keys(data.deletedEntries).length,
    lastUpdated: data.lastUpdated,
  };
}

function logSyncMergeAudit(details: {
  initialLocalData: ExportData;
  currentLocalData: ExportData;
  remoteData: ExportData;
  merged: ExportData;
  conflicts: MergeConflict[];
  localChanged: boolean;
  remoteChanged: boolean;
}) {
  if (!import.meta.env.DEV) return;

  console.debug('[Monthley sync merge]', {
    initialLocal: summarizeTimelineData(details.initialLocalData),
    currentLocal: summarizeTimelineData(details.currentLocalData),
    remote: summarizeTimelineData(details.remoteData),
    merged: summarizeTimelineData(details.merged),
    localChanged: details.localChanged,
    remoteChanged: details.remoteChanged,
    conflicts: details.conflicts,
  });
}

export function useSync() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const timelineStore = useTimelineStore();

  function recordSyncTime() {
    lastSyncedAt.value = new Date();
    saveSyncTime(lastSyncedAt.value);
  }

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
    timelineStore.deletedEntries = data.deletedEntries;
    timelineStore.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : null;
    timelineStore.months = timelineStore.months.filter((month) => month.entries.length > 0);
    timelineStore.addCurrentMonthIfMissing();
    timelineStore.saveLocal();
  }

  function getLocalSnapshot(): ExportData {
    return cloneTimelineData(dataService.exportDataFromState(timelineStore));
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

      const initialLocalData = getLocalSnapshot();

      const remote = await syncService.download(syncKey);
      if (!remote) {
        // Remote empty: push local data silently
        const localData = getLocalSnapshot();
        await syncService.upload(syncKey, localData);
        recordCloudUpdateTime(localData.lastUpdated);
        recordSyncTime();
        return false;
      }

      const remoteData = dataService.validateTimelineData(remote);
      const initialMerge = dataService.mergeTimelineDataDetailed(initialLocalData, remoteData);
      let merged = initialMerge.data;
      let conflicts = initialMerge.conflicts;
      const currentLocalData = getLocalSnapshot();

      if (!isSameTimelineData(currentLocalData, initialLocalData)) {
        const currentMerge = dataService.mergeTimelineDataDetailed(currentLocalData, merged);
        merged = currentMerge.data;
        conflicts = dedupeConflicts([...conflicts, ...currentMerge.conflicts]);
      }

      const localChanged = !isSameTimelineData(currentLocalData, merged);
      const remoteChanged = !isSameTimelineData(remoteData, merged);

      logSyncMergeAudit({
        initialLocalData,
        currentLocalData,
        remoteData,
        merged,
        conflicts,
        localChanged,
        remoteChanged,
      });

      try {
        if (localChanged) {
          applyTimelineData(merged);
          ElMessage.success(t('sync.restoredFromCloud'));
        }

        if (remoteChanged) {
          await syncService.upload(syncKey, merged);
        }
        recordCloudUpdateTime(remoteChanged ? merged.lastUpdated : remoteData.lastUpdated);
      } catch (err) {
        if (isSameTimelineData(getLocalSnapshot(), merged)) {
          applyTimelineData(currentLocalData);
        }
        throw err;
      }

      if (conflicts.length > 0) {
        ElMessage.warning(t('sync.conflictsResolved', { count: conflicts.length }));
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
    if (isSyncing.value) return;

    isSyncing.value = true;
    try {
      const uploadData = getLocalSnapshot();
      const remote = await syncService.download(syncKey);
      let dataToUpload = uploadData;

      if (remote) {
        const remoteData = dataService.validateTimelineData(remote);
        dataToUpload = dataService.mergeTimelineData(remoteData, uploadData);
      }

      await syncService.upload(syncKey, dataToUpload);
      recordCloudUpdateTime(dataToUpload.lastUpdated);
      const currentLocalData = getLocalSnapshot();
      const localChangedDuringPush = !isSameTimelineData(currentLocalData, uploadData);
      if (!localChangedDuringPush && !isSameTimelineData(currentLocalData, dataToUpload)) {
        applyTimelineData(dataToUpload);
      }
      recordSyncTime();
      if (localChangedDuringPush) {
        scheduleUpload();
      }
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

    // Auto-upload when local data changes (debounced 3s)
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
