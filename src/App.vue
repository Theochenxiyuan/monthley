<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTimelineStore } from '@/stores/timeline';
import { useSettingsStore } from './stores/settings';
import { useSync } from '@/composables/useSync';
import SyncOnboardingDialog from '@/components/SyncOnboardingDialog.vue';
import { Icon, loadIcons } from '@iconify/vue';
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
const showSyncOnboarding = ref(false);
const SYNC_ONBOARDING_SKIPPED_KEY = 'syncOnboardingSkipped';

const pullDistance = ref(0);
const isRefreshing = ref(false);
const PULL_THRESHOLD = 60;
let touchStartY = 0;
let isPulling = false;
let appHeightFixTimer: number | undefined;

function updateAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}

function setPullRefreshActive(active: boolean) {
  document.documentElement.classList.toggle('pull-refresh-active', active);
}

function isVisibleOverlay(el: Element): boolean {
  if (el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function hasActiveOverlay(): boolean {
  return Array.from(
    document.querySelectorAll('.el-overlay, .el-dialog, .el-drawer, .el-message-box, .el-popper'),
  ).some(isVisibleOverlay);
}

function resetPullRefresh() {
  isPulling = false;
  pullDistance.value = 0;
  setPullRefreshActive(false);
}

function onTouchStart(e: TouchEvent) {
  const el = mainContentEl.value;
  if (!el) return;
  const target = e.target as HTMLElement;
  if (
    hasActiveOverlay() ||
    target.closest('.entry-item') ||
    target.closest('.el-tag') ||
    target.closest('.el-overlay, .el-dialog, .el-drawer, .el-message-box, .el-popper')
  ) return;
  if (el.scrollTop <= 0) {
    touchStartY = e.touches[0].clientY;
    isPulling = true;
  }
}

function onTouchMove(e: TouchEvent) {
  if (!isPulling || isRefreshing.value) return;
  const el = mainContentEl.value;
  if (!el || el.scrollTop > 0) {
    resetPullRefresh();
    return;
  }
  const diff = e.touches[0].clientY - touchStartY;
  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.5, PULL_THRESHOLD + 20);
    setPullRefreshActive(true);
  } else {
    pullDistance.value = 0;
    setPullRefreshActive(false);
  }
}

function onTouchEnd() {
  if (!isPulling) return;
  isPulling = false;
  if (pullDistance.value >= PULL_THRESHOLD && !isRefreshing.value) {
    isRefreshing.value = true;
    setPullRefreshActive(true);
    pullDistance.value = PULL_THRESHOLD;
    setTimeout(() => {
      location.reload();
    }, 400);
  } else {
    resetPullRefresh();
  }
}

const isDesktop = ref(window.innerWidth >= 768);
function handleResize() {
  updateAppHeight();
  isDesktop.value = window.innerWidth >= 768;
}
onMounted(() => {
  updateAppHeight();
  appHeightFixTimer = window.setTimeout(updateAppHeight, 300);
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  document.addEventListener('visibilitychange', updateAppHeight);
});
onUnmounted(() => {
  if (appHeightFixTimer) window.clearTimeout(appHeightFixTimer);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('orientationchange', handleResize);
  document.removeEventListener('visibilitychange', updateAppHeight);
});

const updateTitle = () => {
  document.title = t('app.title');
};

const currentElementPlusLocale = computed(() => {
  return settingsStore.language === 'zh-CN' ? zhCn : enUs;
});

onMounted(async () => {
  const hadLocalTimeline = localStorage.getItem('timeline') !== null;
  loadIcons([
    'mdi:school',
    'codicon:game',
    'mdi:filmstrip',
    'mdi:book-open-page-variant',
  ]);
  timelineStore.init();
  settingsStore.init();
  updateTitle();
  showSyncOnboarding.value =
    !hadLocalTimeline &&
    !settingsStore.syncKey &&
    localStorage.getItem(SYNC_ONBOARDING_SKIPPED_KEY) !== 'true';
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
      <div
        ref="mainContentEl"
        class="main-content"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="resetPullRefresh"
      >
        <div class="pull-indicator" :style="{ height: pullDistance + 'px', opacity: pullDistance > 0 ? 1 : 0 }">
          <Icon v-if="isRefreshing" icon="mdi:loading" width="20" class="pull-spin" />
          <Icon v-else-if="pullDistance >= PULL_THRESHOLD" icon="mdi:refresh" width="20" style="color: var(--el-color-primary)" />
          <Icon v-else icon="mdi:arrow-down" width="20" style="color: var(--el-text-color-placeholder)" />
        </div>
        <div :key="route.path" class="page-content">
          <router-view v-slot="{ Component }">
            <KeepAlive>
              <component :is="Component" />
            </KeepAlive>
          </router-view>
        </div>
      </div>

      <nav class="navbar">
        <RouterLink
          to="/timeline"
          class="nav-item"
          :class="{ 'nav-item--active': activeRoute === '/timeline' }"
        >
          <el-icon size="24"><Calendar /></el-icon>
          <span>{{ t('navigation.timeline') }}</span>
        </RouterLink>

        <RouterLink
          to="/stats"
          class="nav-item"
          :class="{ 'nav-item--active': activeRoute === '/stats' }"
        >
          <el-icon size="24"><TrendCharts /></el-icon>
          <span>{{ t('navigation.stats') }}</span>
        </RouterLink>

        <RouterLink
          to="/settings"
          class="nav-item"
          :class="{ 'nav-item--active': activeRoute === '/settings' }"
        >
          <el-icon size="24"><Setting /></el-icon>
          <span>{{ t('navigation.settings') }}</span>
        </RouterLink>
      </nav>

      <SyncOnboardingDialog v-if="showSyncOnboarding" v-model="showSyncOnboarding" />
    </div>
  </el-config-provider>
</template>

<style scoped>
#app {
  height: var(--app-height, 100dvh);
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
    height: calc(var(--app-height, 100dvh) - 24px);
  }
}

.main-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.pull-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: opacity 0.15s ease;
}

.pull-spin {
  animation: spin 0.8s linear infinite;
  color: var(--el-color-primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (min-width: 768px) {
  .pull-indicator {
    display: none;
  }
}

.page-content {
  animation: page-enter 200ms ease-out;
}

@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.navbar {
  flex-shrink: 0;
  display: flex;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-bottom: env(safe-area-inset-bottom);
  background-color: var(--navbar-bg, rgba(255, 255, 255, 0.78)) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.04);
  transition: none !important;
}

.nav-item {
  flex: 1;
  min-width: 0;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--el-menu-text-color, var(--el-text-color-secondary));
  font-size: clamp(0.68rem, 2.8vw, 0.85rem);
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.nav-item--active {
  color: var(--el-menu-active-color, var(--el-color-primary));
}

.nav-item:active {
  background-color: var(--el-fill-color-light);
}
</style>
