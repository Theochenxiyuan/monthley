<template>
  <header class="action-bar">
    <span class="action-bar-title">{{ t('settings.title') }}</span>
  </header>

  <div class="setting-content">
    <section class="setting-section">
      <h4 class="section-title">{{ t('settings.preferences') }}</h4>

      <div class="setting-row">
        <span class="setting-label">{{ t('settings.language') }}</span>
        <el-select v-model="currentLanguage" size="default" style="width: 150px">
          <el-option label="中文" value="zh-CN" />
          <el-option label="English" value="en-US" />
        </el-select>
      </div>

      <div class="setting-row">
        <span class="setting-label">{{ t('settings.appearance') }}</span>
        <el-switch
          v-model="settingsStore.isDark"
          size="large"
          style="--el-switch-off-color: #dcdfe6; --el-switch-on-color: #333333; --el-switch-off-text-color: #606266; --el-switch-on-text-color: #ffffff"
          :active-text="t('settings.dark')"
          :inactive-text="t('settings.light')"
          inactive-action-icon="Sunny"
          active-action-icon="Moon"
          inline-prompt
        />
      </div>

      <div class="setting-row">
        <span class="setting-label">
          {{ t('settings.expandAll') }}
          <el-tooltip placement="top">
            <template #content>
              <div style="max-width: 80vw">{{ t('settings.expandAllTooltip') }}</div>
            </template>
            <el-icon class="label-hint"><QuestionFilled /></el-icon>
          </el-tooltip>
        </span>
        <el-switch v-model="settingsStore.expandAll" size="large" inline-prompt />
      </div>
    </section>

    <section class="setting-section">
      <h4 class="section-title">{{ t('sync.title') }}</h4>

      <div class="setting-row-center">
        <template v-if="settingsStore.syncKey && !isEditingKey">
          <el-input
            v-model="settingsStore.syncKey"
            readonly
            style="max-width: 280px"
            size="default"
          >
            <template #append>
              <el-button @click="copyKey">
                <el-icon><DocumentCopy /></el-icon>
              </el-button>
            </template>
          </el-input>
        </template>
        <template v-else-if="isEditingKey">
          <el-input
            v-model="inputKey"
            :placeholder="t('sync.enterKeyPlaceholder')"
            style="max-width: 280px"
            size="default"
            clearable
          >
            <template #append>
              <el-button @click="confirmKey" :disabled="!isValidKey">
                {{ t('common.confirm') }}
              </el-button>
            </template>
          </el-input>
        </template>
        <template v-else>
          <el-button type="primary" @click="generateKey">
            {{ t('sync.generateKey') }}
          </el-button>
          <el-button @click="startEditKey">
            {{ t('sync.useExistingKey') }}
          </el-button>
        </template>
      </div>

      <div v-if="settingsStore.syncKey && !isEditingKey" class="setting-row-center sync-actions">
        <el-button :loading="sync.isSyncing.value" @click="sync.manualSync">
          {{ t('sync.syncNow') }}
        </el-button>
        <el-button type="danger" plain @click="clearKey">
          {{ t('sync.clearKey') }}
        </el-button>
      </div>

      <div v-if="isEditingKey" class="setting-row-center">
        <el-button link @click="cancelKeyEdit">
          {{ t('common.cancel') }}
        </el-button>
      </div>

      <div v-if="settingsStore.syncKey && !isEditingKey" class="setting-row-center">
        <el-button link type="primary" @click="startEditKey">
          {{ t('sync.useOtherKey') }}
        </el-button>
      </div>
    </section>

    <section class="setting-section">
      <h4 class="section-title">{{ t('settings.backupRestore') }}</h4>

      <div class="setting-row-center">
        <el-button plain type="primary" @click="exportTimeline">
          <el-icon class="btn-icon"><Download /></el-icon>
          {{ t('settings.exportTimeline') }}
        </el-button>

        <el-button plain @click="triggerImport">
          <el-icon class="btn-icon"><Upload /></el-icon>
          {{ t('settings.importTimeline') }}
        </el-button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImport"
        />
      </div>

      <div class="setting-row-center warning-text">
        <el-text type="warning" size="small">
          {{ t('settings.importWarning') }}
        </el-text>
      </div>
    </section>

    <section class="setting-section danger-zone">
      <h4 class="section-title danger-title">{{ t('settings.dangerZone') }}</h4>

      <div class="setting-row-center">
        <el-button type="danger" plain @click="confirmClear">
          <el-icon class="btn-icon"><Delete /></el-icon>
          {{ t('settings.clearTimeline') }}
        </el-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.setting-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.setting-section {
  background-color: var(--el-fill-color-light);
  border-radius: 10px;
  padding: 1rem;
}

.section-title {
  margin: 0 0 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.625rem 0;
  min-height: 40px;
}

.setting-row:first-child {
  padding-top: 0;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--el-text-color-regular);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.label-hint {
  color: var(--el-text-color-placeholder);
  font-size: 0.85rem;
  cursor: help;
  transition: color 0.2s ease;
}
.label-hint:hover {
  color: var(--el-text-color-secondary);
}

.setting-row-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.btn-icon {
  margin-right: 4px;
}

.warning-text {
  padding-top: 0.25rem;
}

.sync-actions {
  padding-top: 0.25rem;
}

.danger-zone {
  border-color: var(--el-color-danger-light-5);
  background-color: var(--el-color-danger-light-9);
}

.danger-title {
  color: var(--el-color-danger);
  border-bottom-color: var(--el-color-danger-light-5);
}

:deep(.el-switch__core) {
  transition: background-color 0.3s ease;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '../stores/settings';
import { useTimelineStore } from '../stores/timeline';
import { useSync } from '@/composables/useSync';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Download, Upload, Delete, DocumentCopy } from '@element-plus/icons-vue';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const timelineStore = useTimelineStore();
const sync = useSync();
const fileInputRef = ref<HTMLInputElement>();

const isEditingKey = ref(false);
const inputKey = ref('');

const isValidKey = computed(() => /^[a-zA-Z0-9]{8,32}$/.test(inputKey.value));

const currentLanguage = computed({
  get: () => settingsStore.language,
  set: (value) => {
    settingsStore.setLanguage(value);
  },
});

const exportTimeline = () => {
  timelineStore.exportJSON();
  ElMessage.success(t('settings.exportSuccess'));
};

const triggerImport = () => {
  fileInputRef.value?.click();
};

const handleImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  if (!file.name.endsWith('.json')) {
    ElMessage.error(t('settings.invalidFileType'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('settings.confirmImport'),
      t('settings.importTimeline'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await timelineStore.importJSON(file);
    ElMessage.success(t('settings.importSuccess'));

    target.value = '';
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('settings.importError'));
    }
  }
};

const confirmClear = async () => {
  try {
    await ElMessageBox.confirm(
      t('settings.confirmClear'),
      t('settings.clearTimeline'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'error',
        distinguishCancelAndClose: true,
      }
    );

    timelineStore.clearData();
    timelineStore.addCurrentMonthIfMissing();
    ElMessage.success(t('settings.clearSuccess'));
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(t('settings.clearError'));
    }
  }
};

const generateKey = async () => {
  try {
    await ElMessageBox.confirm(
      t('sync.confirmGenerateKey'),
      t('sync.generateKey'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  settingsStore.syncKey = sync.generateSyncKey();
  ElMessage.success(t('sync.syncSuccess'));
};

const copyKey = async () => {
  if (!settingsStore.syncKey) return;
  try {
    await navigator.clipboard.writeText(settingsStore.syncKey);
    ElMessage.success('Copied');
  } catch {
    ElMessage.error('Copy failed');
  }
};

const clearKey = async () => {
  try {
    await ElMessageBox.confirm(
      t('sync.clearKey'),
      t('sync.title'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    settingsStore.syncKey = null;
  } catch {
    // cancelled
  }
};

const startEditKey = () => {
  inputKey.value = '';
  isEditingKey.value = true;
};

const confirmKey = async () => {
  if (!isValidKey.value) return;
  settingsStore.syncKey = inputKey.value;
  isEditingKey.value = false;
  try {
    await sync.pull();
    ElMessage.success(t('sync.syncSuccess'));
  } catch {
    ElMessage.error(t('sync.syncFailed'));
  }
};

const cancelKeyEdit = () => {
  isEditingKey.value = false;
  inputKey.value = '';
};
</script>
