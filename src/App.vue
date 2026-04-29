<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTimelineStore } from '@/stores/timeline';
import { useSettingsStore } from './stores/settings';
import { useSync } from '@/composables/useSync';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import enUs from 'element-plus/es/locale/lang/en';
const { t, locale } = useI18n();
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();
const { init: initSync } = useSync();
const route = useRoute();
const activeRoute = computed(() => route.path);

const scrollPositions: Record<string, number> = {};
const mainContentEl = ref<HTMLElement | null>(null);

const updateTitle = () => {
  document.title = t('app.title');
};

const currentElementPlusLocale = computed(() => {
  return settingsStore.language === 'zh-CN' ? zhCn : enUs;
});

onMounted(async () => {
  timelineStore.init();
  settingsStore.init();
  updateTitle();
  await initSync();
});

watch(locale, () => {
  updateTitle();
});

watch(
  () => settingsStore.isDark,
  (newVal) => {
    document.documentElement.classList.toggle('dark', newVal);
  }
);

watch(
  () => route.path,
  (to, from) => {
    const el = mainContentEl.value;
    if (!el) return;
    if (from) {
      scrollPositions[from] = el.scrollTop;
    }
    nextTick(() => {
      const target = scrollPositions[to] ?? 0;
      el.scrollTo({ top: target });
    });
  },
);
</script>

<template>
  <el-config-provider :locale="currentElementPlusLocale">
    <div id="app">
      <div ref="mainContentEl" class="main-content" v-auto-animate>
        <router-view v-slot="{ Component }">
          <KeepAlive>
            <component :is="Component" />
          </KeepAlive>
        </router-view>
      </div>

      <el-menu mode="horizontal" :default-active="activeRoute" router class="navbar">
        <el-menu-item index="/timeline">
          <el-icon size="24"><Calendar /></el-icon>
          <span>{{ t('navigation.timeline') }}</span>
        </el-menu-item>

        <el-menu-item index="/stats">
          <el-icon size="24"><TrendCharts /></el-icon>
          <span>{{ t('navigation.stats') }}</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon size="24"><Setting /></el-icon>
          <span>{{ t('navigation.settings') }}</span>
        </el-menu-item>
      </el-menu>
    </div>
  </el-config-provider>
</template>

<style scoped>
#app {
  height: 100vh;
  height: 100dvh;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--el-bg-color);
  box-shadow: 0 0 0 1px var(--el-border-color-lighter),
              0 8px 32px rgba(0, 0, 0, 0.12);
}

@media (min-width: 768px) {
  #app {
    border-radius: 16px;
    margin: 12px auto;
    height: calc(100dvh - 24px);
  }
}

.main-content {
  flex: 1;
  overflow-y: auto;
}

.navbar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-around;
  border-top: 1px solid var(--el-border-color-lighter);
  background-color: var(--navbar-bg, rgba(255, 255, 255, 0.78)) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.04);
  transition: none !important;
}
</style>
