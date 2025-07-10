<template>
  <header class="action-bar">
    <h3>设置</h3>
  </header>

  <div class="setting-content">
    <div class="setting-item">
      <el-text>深色模式: </el-text>
      <el-switch
        v-model="settingsStore.isDark"
        size="large"
        style="--el-switch-off-color: #aaaaaa; --el-switch-on-color: #444444"
        active-text="深色"
        inactive-text="浅色"
        inactive-action-icon="Sunny"
        active-action-icon="Moon"
        inline-prompt
      />
    </div>
    <div class="setting-item">
      <el-text
        >默认展开所有月份
        <el-tooltip class="box-item" placement="top">
          <template #content>
            <div style="max-width: 80vw">
              如果不选择展开，默认会将“已完成所有条目的过去月份”和“全条目都未开始的未来月份”折叠起来
            </div>
          </template>
          <el-text
            ><el-icon><QuestionFilled /></el-icon> </el-text></el-tooltip
        >:
      </el-text>

      <el-switch v-model="settingsStore.expandAll" size="large" inline-prompt />
    </div>

    <div class="setting-item">
      <el-text>月份折叠时显示条目文字: </el-text>

      <el-switch
        v-model="settingsStore.showEntriesCollapsed"
        size="large"
        inline-prompt
        :disabled="settingsStore.expandAll"
      />
    </div>

    <div class="setting-item">
      <el-text>月份折叠时显示条目数量: </el-text>

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
}
.setting-item {
  vertical-align: middle;
}
</style>

<script setup lang="ts">
import { useSettingsStore } from '../stores/settings';
const settingsStore = useSettingsStore();
</script>
