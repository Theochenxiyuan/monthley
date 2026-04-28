<template>
  <header class="action-bar">
    <h3>{{ t('settings.title') }}</h3>
  </header>

  <div class="setting-content">
    <div class="setting-item">
      <el-text>{{ t('settings.language') }}: </el-text>
      <el-select v-model="currentLanguage" size="default" style="width: 150px">
        <el-option label="中文" value="zh-CN"></el-option>
        <el-option label="English" value="en-US"></el-option>
      </el-select>
    </div>
    <div class="setting-item">
      <el-text>{{ t('settings.appearance') }}: </el-text>
      <el-switch
        v-model="settingsStore.isDark"
        size="large"
        style="--el-switch-off-color: #f5f5f5; --el-switch-on-color: #333333"
        :active-text="t('settings.dark')"
        :inactive-text="t('settings.light')"
        inactive-action-icon="Sunny"
        active-action-icon="Moon"
        inline-prompt
      />
    </div>
    <div class="setting-item">
      <el-text
        >{{ t('settings.expandAll') }}
        <el-tooltip class="box-item" placement="top">
          <template #content>
            <div style="max-width: 80vw">
              {{ t('settings.expandAllTooltip') }}
            </div>
          </template>
          <el-text
            ><el-icon><QuestionFilled /></el-icon> </el-text></el-tooltip
        >:
      </el-text>

      <el-switch v-model="settingsStore.expandAll" size="large" inline-prompt />
    </div>

    <el-divider />

    <div class="setting-item">
      <el-button type="primary" @click="exportTimeline">
        <el-icon><Download /></el-icon>
        {{ t('settings.exportTimeline') }}
      </el-button>
    </div>

    <div class="setting-item">
      <el-button @click="triggerImport">
        <el-icon><Upload /></el-icon>
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

    <div class="setting-item warning-text">
      <el-text type="warning" size="small">
        {{ t('settings.importWarning') }}
      </el-text>
    </div>

    <el-divider />

    <h4 class="sync-title">{{ t('sync.title') }}</h4>

    <div class="setting-item">
      <template v-if="settingsStore.syncKey && !isEditingKey">
        <el-input
          v-model="settingsStore.syncKey"
          readonly
          style="max-width: 260px"
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
          style="max-width: 260px"
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

    <div v-if="settingsStore.syncKey && !isEditingKey" class="setting-item sync-actions">
      <el-button :loading="sync.isSyncing.value" @click="sync.manualSync">
        {{ t('sync.syncNow') }}
      </el-button>
      <el-button type="danger" plain @click="clearKey">
        {{ t('sync.clearKey') }}
      </el-button>
    </div>

    <div v-if="isEditingKey" class="setting-item">
      <el-button link @click="cancelKeyEdit">
        {{ t('common.cancel') }}
      </el-button>
    </div>

    <div v-if="settingsStore.syncKey && !isEditingKey" class="setting-item">
      <el-button link type="primary" @click="startEditKey">
        {{ t('sync.useOtherKey') }}
      </el-button>
    </div>

    <el-divider />

    <div class="setting-item danger-section">
      <el-button type="danger" @click="confirmClear">
        <el-icon><Delete /></el-icon>
        {{ t('settings.clearTimeline') }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.action-bar {
  justify-content: center;
}
.setting-content {
  text-align: center;
  padding: 0.5rem;
}
.setting-item {
  vertical-align: middle;
  margin: 0.5rem 0;
}
.warning-text {
  margin-top: 1rem;
}
.danger-section {
  margin-top: 1.5rem;
}
:deep(.el-switch__core) {
  transition: background-color 0.3s ease;
}
.sync-title {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
  font-weight: 600;
}
.sync-actions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
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
