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

    <div class="setting-item">
      <el-text>{{ t('settings.showEntriesCollapsed') }}: </el-text>

      <el-switch
        v-model="settingsStore.showEntriesCollapsed"
        size="large"
        inline-prompt
        :disabled="settingsStore.expandAll"
      />
    </div>

    <div class="setting-item">
      <el-text>{{ t('settings.showNumCollapsed') }}: </el-text>

      <el-switch
        v-model="settingsStore.showNumCollapsed"
        size="large"
        inline-prompt
        :disabled="settingsStore.expandAll"
      />
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
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '../stores/settings';
import { useTimelineStore } from '../stores/timeline';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Download, Upload, Delete } from '@element-plus/icons-vue';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const timelineStore = useTimelineStore();
const fileInputRef = ref<HTMLInputElement>();

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
</script>
