<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTimelineStore } from '@/stores/timeline';
import { useSettingsStore } from './stores/settings';
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();
const route = useRoute();
const activeRoute = computed(() => route.path);
onMounted(() => {
  timelineStore.loadLocal();
  settingsStore.init();
});
</script>

<template>
  <div id="app">
    <router-view></router-view>

    <div class="navbar">
      <el-menu mode="horizontal" :default-active="activeRoute" router>
        <el-menu-item index="/timeline">
          <el-icon size="24"><Calendar /></el-icon>
          <span>时间线</span>
        </el-menu-item>

        <el-menu-item index="/settings">
          <el-icon size="24"><Setting /></el-icon>
          <span>设置</span>
        </el-menu-item>
      </el-menu>
    </div>
  </div>
</template>

<style scoped>
#app {
  height: 100vh;
  max-width: 800px;
  position: relative;
  margin: auto;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar {
  position: fixed;
  bottom: 0;
  width: 800px;
  max-width: 100vw;
  height: auto;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-top: 1px solid var(--el-menu-border-color);
  background-color: var(--el-menu-bg-color);
}
.navbar .el-menu {
  width: 100%;
  display: flex;
  justify-content: space-around;
}
.tab-label {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
