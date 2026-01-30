<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTimelineStore } from '@/stores/timeline';
import { useSettingsStore } from './stores/settings';
const { t } = useI18n();
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();
const route = useRoute();
const activeRoute = computed(() => route.path);
onMounted(() => {
  timelineStore.init();
  settingsStore.init();
});
</script>

<template>
  <div id="app">
    <div v-auto-animate>
      <router-view></router-view>
    </div>

    <div class="navbar">
      <el-menu mode="horizontal" :default-active="activeRoute" router>
        <el-menu-item index="/timeline">
          <el-icon size="24"><Calendar /></el-icon>
          <span>{{ t('navigation.timeline') }}</span>
        </el-menu-item>

        <el-menu-item index="/settings">
          <el-icon size="24"><Setting /></el-icon>
          <span>{{ t('navigation.settings') }}</span>
        </el-menu-item>
      </el-menu>
    </div>
  </div>
</template>

<style scoped>
#app {
  height: 100vh;
  max-width: 1200px; /* Increased from 800px */
  width: 100%;
  position: relative;
  margin: auto;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 60px; /* Space for navbar */
}

.navbar {
  position: fixed;
  bottom: 0;
  width: 100%;
  max-width: 1200px;
  height: auto;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-top: 1px solid var(--el-menu-border-color);
  background-color: var(--el-menu-bg-color);
  z-index: 1000;
}

.navbar .el-menu {
  width: 100%;
  display: flex;
  justify-content: space-around;
}
</style>
