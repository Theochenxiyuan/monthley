<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useStats } from '@/composables/useStats';
import { useDesktopAppOffset } from '@/composables/useDesktopAppOffset';
import { Icon } from '@iconify/vue';

const StatCard = defineAsyncComponent(
  () => import('@/components/stats/StatCard.vue'),
);
const TypeDistribution = defineAsyncComponent(
  () => import('@/components/stats/TypeDistribution.vue'),
);
const StatusRing = defineAsyncComponent(
  () => import('@/components/stats/StatusRing.vue'),
);
const YearHeatmap = defineAsyncComponent(
  () => import('@/components/stats/YearHeatmap.vue'),
);
const YearSummaryDialog = defineAsyncComponent(
  () => import('@/components/stats/YearSummaryDialog.vue'),
);
const YearSummaryPanel = defineAsyncComponent(
  () => import('@/components/stats/YearSummaryPanel.vue'),
);

const { t } = useI18n();
const {
  totalCount,
  completedCount,
  inProgressCount,
  completionRate,
  totalMonthsWithEntries,
  typeStats,
  statusStats,
  yearHeatmapData,
  years,
} = useStats();

const showSummary = ref(false);
const summaryYear = ref(new Date().getFullYear());
const viewportWidth = ref(window.innerWidth);
const isDesktopReview = computed(
  () => viewportWidth.value >= 1032 && totalCount.value > 0,
);
const { offsetX } = useDesktopAppOffset();
const STATS_SIDE_PANEL_MIN_WIDTH = 280;
const STATS_SIDE_PANEL_MAX_WIDTH = 420;
const APP_RIGHT_SIDE_LEFT_OFFSET = 372;
const DESKTOP_SAFE_PADDING = 8;
const sidePanelStyle = computed(() => {
  const preferredLeft =
    viewportWidth.value / 2 + offsetX.value + APP_RIGHT_SIDE_LEFT_OFFSET;
  const availableWidth =
    viewportWidth.value - preferredLeft - DESKTOP_SAFE_PADDING;
  const panelWidth = Math.min(
    STATS_SIDE_PANEL_MAX_WIDTH,
    Math.max(STATS_SIDE_PANEL_MIN_WIDTH, availableWidth),
  );
  const left = Math.min(
    preferredLeft,
    viewportWidth.value - panelWidth - DESKTOP_SAFE_PADDING,
  );
  return {
    left: `${Math.max(DESKTOP_SAFE_PADDING, left)}px`,
    top: '60px',
    width: `${panelWidth}px`,
  };
});

function handleResize() {
  viewportWidth.value = window.innerWidth;
}

onMounted(() => window.addEventListener('resize', handleResize));
onUnmounted(() => window.removeEventListener('resize', handleResize));

function openSummary() {
  summaryYear.value = new Date().getFullYear();
  showSummary.value = true;
}
</script>

<template>
  <header class="action-bar">
    <span class="action-bar-title">{{ t('stats.title') }}</span>
    <el-button
      v-if="!isDesktopReview"
      class="summary-btn"
      type="warning"
      size="small"
      plain
      :disabled="totalCount === 0"
      @click="openSummary"
    >
      <Icon icon="mdi:calendar-star" width="14" />
      <span>{{ t('yearSummary.title') }}</span>
    </el-button>
  </header>

  <YearSummaryDialog v-model="showSummary" :initial-year="summaryYear" />

  <div class="stats-content">
    <div v-if="totalCount === 0" class="empty-state">
      <el-empty :description="t('stats.noData')">
        <template #image>
          <Icon
            icon="mdi:chart-bar"
            width="64"
            style="color: var(--el-text-color-placeholder)"
          />
        </template>
      </el-empty>
    </div>

    <template v-else>
      <div class="stats-section overview-cards">
        <StatCard
          :label="t('stats.totalEntries')"
          :value="totalCount"
          type="primary"
        />
        <StatCard
          :label="t('stats.completed')"
          :value="completedCount"
          type="success"
        />
        <StatCard
          :label="t('stats.completionRate')"
          :value="completionRate"
          type="warning"
          suffix="%"
        />
      </div>

      <div class="stats-section additional-cards">
        <StatCard
          :label="t('stats.inProgress')"
          :value="inProgressCount"
          type="primary"
        />
        <StatCard
          :label="t('stats.totalMonths')"
          :value="totalMonthsWithEntries"
          type="info"
        />
      </div>

      <div class="stats-section ring-row">
        <div class="ring-col">
          <TypeDistribution :type-stats="typeStats" />
        </div>
        <div class="ring-col">
          <StatusRing :status-stats="statusStats" :total-count="totalCount" />
        </div>
      </div>

      <div class="stats-section">
        <YearHeatmap :heatmap-data="yearHeatmapData" :years="years" />
      </div>
    </template>
  </div>

  <Teleport to="body">
    <YearSummaryPanel
      v-if="isDesktopReview"
      class="year-summary-side-floating"
      :style="sidePanelStyle"
      :initial-year="summaryYear"
    />
  </Teleport>
</template>

<style scoped>
.summary-btn {
  margin-left: auto;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.75rem;
  gap: 4px;
}

.stats-content {
  padding: 1rem;
}

.stats-section {
  margin-top: 0.75rem;
}

.overview-cards {
  display: flex;
  gap: 0.75rem;
}

.additional-cards {
  display: flex;
  gap: 0.75rem;
}

.additional-cards > :deep(.stat-card) {
  max-width: 50%;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 40vh;
}

.ring-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 600px) {
  .ring-row {
    flex-direction: row;
  }
  .ring-col {
    flex: 1;
    min-width: 0;
  }
}

.year-summary-side-floating {
  position: fixed;
  z-index: 1100;
  height: auto;
  max-height: calc(var(--app-height, 100dvh) - 128px);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: color-mix(in srgb, var(--el-bg-color) 92%, transparent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
}
</style>
