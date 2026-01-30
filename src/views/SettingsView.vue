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
        style="--el-switch-off-color: #aaaaaa; --el-switch-on-color: #444444"
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
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '../stores/settings';
const { t, locale } = useI18n();
const settingsStore = useSettingsStore();
const currentLanguage = computed({
  get: () => settingsStore.language,
  set: (value) => {
    settingsStore.setLanguage(value);
  },
});
</script>
