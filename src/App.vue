<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTimelineStore } from '@/stores/timeline';
import { useSettingsStore } from './stores/settings';
import { useSync } from '@/composables/useSync';
import { useDesktopAppOffset } from '@/composables/useDesktopAppOffset';
import SyncOnboardingDialog from '@/components/SyncOnboardingDialog.vue';
import { Icon, loadIcons } from '@iconify/vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import enUs from 'element-plus/es/locale/lang/en';
const { t, locale } = useI18n();
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();
const { init: initSync } = useSync();
const route = useRoute();
const router = useRouter();
const activeRoute = computed(() => route.path);
const { appOffsetStyle, isDraggingApp, resetAppOffset, startDraggingApp } = useDesktopAppOffset();

const quickSettingsPopover = ref<{ hide: () => void } | null>(null);
const isQuickSettingsOpen = ref(false);

const currentLanguage = computed({
  get: () => settingsStore.language,
  set: (value) => {
    settingsStore.setLanguage(value);
  },
});

function goToSettings() {
  quickSettingsPopover.value?.hide();
  router.push('/settings');
}

const scrollPositions: Record<string, number> = {};
const appEl = ref<HTMLElement | null>(null);
const mainContentEl = ref<HTMLElement | null>(null);
const showSyncOnboarding = ref(false);
const appDragHintStyle = ref<Record<string, string>>({});
const SYNC_ONBOARDING_SKIPPED_KEY = 'syncOnboardingSkipped';

const pullDistance = ref(0);
const isRefreshing = ref(false);
const PULL_THRESHOLD = 60;
let touchStartY = 0;
let isPulling = false;
let appHeightFixTimer: number | undefined;
let dragHintFrame: number | null = null;

function updateAppHeight() {
  document.documentElement.style.setProperty(
    '--app-height',
    `${window.innerHeight}px`,
  );
}

function setPullRefreshActive(active: boolean) {
  document.documentElement.classList.toggle('pull-refresh-active', active);
}

function isVisibleOverlay(el: Element): boolean {
  if (el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(el);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0'
  ) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function hasActiveOverlay(): boolean {
  return Array.from(
    document.querySelectorAll(
      '.el-overlay, .el-dialog, .el-drawer, .el-message-box, .el-popper',
    ),
  ).some(isVisibleOverlay);
}

function isInteractiveElement(target: HTMLElement): boolean {
  return Boolean(target.closest(
    'button, a, input, textarea, select, [role="button"], .el-button, .el-input, .el-select, .el-dropdown',
  ));
}

function onMainPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.action-bar') || isInteractiveElement(target)) return;
  startDraggingApp(event);
}

function updateAppDragHintPosition() {
  const rect = appEl.value?.getBoundingClientRect();
  if (!rect) return;

  appDragHintStyle.value = {
    left: `${rect.left}px`,
    top: `${rect.top + 24}px`,
    width: `${rect.width}px`,
  };
}

function startDragHintLoop() {
  if (dragHintFrame !== null) return;
  const tick = () => {
    updateAppDragHintPosition();
    if (isDraggingApp.value) {
      dragHintFrame = requestAnimationFrame(tick);
    } else {
      dragHintFrame = null;
    }
  };
  dragHintFrame = requestAnimationFrame(tick);
}

function stopDragHintLoop() {
  if (dragHintFrame === null) return;
  cancelAnimationFrame(dragHintFrame);
  dragHintFrame = null;
}

function resetDesktopLayout() {
  resetAppOffset();
  window.dispatchEvent(new Event('monthley:reset-desktop-layout'));
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
    target.closest(
      '.el-overlay, .el-dialog, .el-drawer, .el-message-box, .el-popper',
    )
  )
    return;
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
  stopDragHintLoop();
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

watch(isDraggingApp, (dragging) => {
  if (dragging) {
    updateAppDragHintPosition();
    startDragHintLoop();
  } else {
    stopDragHintLoop();
  }
});

watch(
  () => settingsStore.isDark,
  (newVal) => {
    document.documentElement.classList.toggle('dark', newVal);
  },
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
    <div
      ref="appEl"
      id="app"
      :class="{ 'app--dragging': isDraggingApp }"
      :style="appOffsetStyle"
    >
      <div
        ref="mainContentEl"
        class="main-content"
        @pointerdown="onMainPointerDown"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="resetPullRefresh"
      >
        <div
          class="pull-indicator"
          :style="{
            height: pullDistance + 'px',
            opacity: pullDistance > 0 ? 1 : 0,
          }"
        >
          <Icon
            v-if="isRefreshing"
            icon="mdi:loading"
            width="20"
            class="pull-spin"
          />
          <Icon
            v-else-if="pullDistance >= PULL_THRESHOLD"
            icon="mdi:refresh"
            width="20"
            style="color: var(--el-color-primary)"
          />
          <Icon
            v-else
            icon="mdi:arrow-down"
            width="20"
            style="color: var(--el-text-color-placeholder)"
          />
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

      <SyncOnboardingDialog
        v-if="showSyncOnboarding"
        v-model="showSyncOnboarding"
      />
    </div>
    <Teleport to="body">
      <el-popover
        v-if="isDesktop"
        ref="quickSettingsPopover"
        trigger="click"
        placement="bottom-end"
        :offset="8"
        popper-class="quick-settings-popover"
        :width="280"
        @show="isQuickSettingsOpen = true"
        @hide="isQuickSettingsOpen = false"
      >
        <template #reference>
          <button
            type="button"
            class="quick-settings-btn"
            :title="t('settings.quickSettings')"
            :aria-label="t('settings.quickSettings')"
            :class="{ 'is-active': isQuickSettingsOpen }"
          >
            <el-icon size="17"><Setting /></el-icon>
          </button>
        </template>

        <div class="quick-settings-panel">
          <div class="quick-settings-row">
            <span class="quick-settings-label">{{ t('settings.language') }}</span>
            <el-select v-model="currentLanguage" size="default" style="width: 150px">
              <el-option label="中文" value="zh-CN" />
              <el-option label="English" value="en-US" />
            </el-select>
          </div>

          <div class="quick-settings-row">
            <span class="quick-settings-label">{{ t('settings.appearance') }}</span>
            <el-switch
              v-model="settingsStore.isDark"
              size="large"
              style="
                --el-switch-off-color: #dcdfe6;
                --el-switch-on-color: #333333;
                --el-switch-off-text-color: #606266;
                --el-switch-on-text-color: #ffffff;
              "
              :active-text="t('settings.dark')"
              :inactive-text="t('settings.light')"
              inactive-action-icon="Sunny"
              active-action-icon="Moon"
              inline-prompt
            />
          </div>

          <div class="quick-settings-row">
            <span class="quick-settings-label">
              {{ t('settings.expandAll') }}
              <el-tooltip placement="top">
                <template #content>
                  <div style="max-width: 240px">{{ t('settings.expandAllTooltip') }}</div>
                </template>
                <el-icon class="quick-settings-hint"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
            <el-switch
              v-model="settingsStore.expandAll"
              size="large"
              inline-prompt
            />
          </div>

          <el-divider style="margin: 10px 0" />

          <el-button link type="primary" @click="goToSettings">
            {{ t('settings.fullSettings') }}
          </el-button>
        </div>
      </el-popover>

      <button
        v-if="isDesktop"
        type="button"
        class="desktop-layout-reset"
        :title="t('unscheduled.resetLayout')"
        :aria-label="t('unscheduled.resetLayout')"
        @click="resetDesktopLayout"
      >
        <el-icon size="17"><RefreshLeft /></el-icon>
      </button>
      <div
        v-if="isDraggingApp"
        class="app-drag-hints"
        :style="appDragHintStyle"
        aria-hidden="true"
      >
        <span class="app-drag-hint app-drag-hint--left">‹</span>
        <span class="app-drag-hint app-drag-hint--right">›</span>
      </div>
    </Teleport>
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
  box-shadow:
    0 0 0 1px var(--el-border-color-lighter),
    0 8px 32px rgba(0, 0, 0, 0.12);
  transition: transform 0.12s ease-out;
}

@media (min-width: 768px) {
  #app {
    border-radius: 16px;
    margin: 12px auto;
    height: calc(var(--app-height, 100dvh) - 24px);
  }

  #app :deep(.action-bar) {
    cursor: grab;
    user-select: none;
    touch-action: none;
  }

  #app.app--dragging {
    transition: none;
  }

  #app.app--dragging :deep(.action-bar) {
    cursor: grabbing;
  }

  #app :deep(.action-bar button),
  #app :deep(.action-bar a),
  #app :deep(.action-bar .el-button),
  #app :deep(.action-bar .el-input),
  #app :deep(.action-bar .el-select),
  #app :deep(.action-bar .el-dropdown) {
    cursor: auto;
  }
}

.app-drag-hints {
  position: fixed;
  z-index: 1300;
  height: 0;
  pointer-events: none;
}

.app-drag-hint {
  position: absolute;
  top: 0;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 1.6rem;
  line-height: 1;
}

.app-drag-hint--left {
  left: -30px;
}

.app-drag-hint--right {
  right: -30px;
}

.desktop-layout-reset {
  display: none;
}

@media (min-width: 768px) {
  .desktop-layout-reset {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1250;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 9px;
    background: color-mix(in srgb, var(--el-bg-color) 86%, transparent);
    color: var(--el-text-color-secondary);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(10px);
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .desktop-layout-reset:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    box-shadow: 0 6px 18px rgba(64, 158, 255, 0.12);
  }

  .quick-settings-btn {
    position: fixed;
    top: 16px;
    right: 52px;
    z-index: 1250;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 9px;
    background: color-mix(in srgb, var(--el-bg-color) 86%, transparent);
    color: var(--el-text-color-secondary);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(10px);
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .quick-settings-btn.is-active,
  .quick-settings-btn:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    box-shadow: 0 6px 18px rgba(64, 158, 255, 0.12);
  }
}

:global(.quick-settings-popover) {
  padding: 12px 16px !important;
}

.quick-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
}

.quick-settings-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--el-text-color-regular);
  font-size: 0.85rem;
  font-weight: 500;
  flex-shrink: 0;
}

.quick-settings-hint {
  color: var(--el-text-color-placeholder);
  font-size: 0.85rem;
  cursor: help;
  transition: color 0.2s ease;
}

.quick-settings-hint:hover {
  color: var(--el-text-color-secondary);
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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
