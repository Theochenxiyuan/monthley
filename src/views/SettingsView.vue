<template>
  <header class="action-bar">
    <h3>设置</h3>
  </header>

  <div class="setting-content">
    <div class="setting-item">
      <span>深色模式: </span>
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
    更多功能将在下一阶段加入
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
  margin: 10px 0;
}
</style>

<script setup lang="ts">
import { useSettingsStore } from '../stores/settings';
const settingsStore = useSettingsStore();
</script>
