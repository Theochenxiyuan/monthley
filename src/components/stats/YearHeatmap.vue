<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { YearHeatmapCell } from '@/composables/useStats';

const props = defineProps<{
  heatmapData: YearHeatmapCell[];
  years: number[];
}>();

const { t, locale } = useI18n();

const maxCount = computed(() =>
  Math.max(...props.heatmapData.map((c) => c.count), 1),
);

const monthLabels = computed(() => {
  const labels = [];
  for (let i = 1; i <= 12; i++) {
    labels.push(
      new Intl.DateTimeFormat(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
        month: 'short',
      }).format(new Date(2000, i - 1, 1)),
    );
  }
  return labels;
});

function getColorClass(count: number): string {
  if (count === 0) return 'heat-0';
  const ratio = count / maxCount.value;
  if (ratio <= 0.25) return 'heat-1';
  if (ratio <= 0.5) return 'heat-2';
  if (ratio <= 0.75) return 'heat-3';
  return 'heat-4';
}

function getTooltip(cell: YearHeatmapCell): string {
  if (cell.count === 0) {
    return `${cell.label}: ${t('stats.noEntries')}`;
  }
  return `${cell.label}: ${cell.count} ${t('unit.count')}`;
}
</script>

<template>
  <div class="year-heatmap">
    <h4 class="section-title">{{ t('stats.yearHeatmap') }}</h4>

    <div v-if="years.length === 0" class="empty-hint">
      <el-text type="info" size="small">{{ t('stats.noData') }}</el-text>
    </div>

    <div v-else class="heatmap-grid">
      <div class="heatmap-header">
        <span class="year-label-spacer"></span>
        <div class="heatmap-cell-row">
          <span v-for="(label, i) in monthLabels" :key="i" class="month-label">
            {{ i % 2 === 0 ? label : '' }}
          </span>
        </div>
      </div>
      <div class="heatmap-rows">
        <div v-for="year in years" :key="year" class="heatmap-row">
          <span class="year-label">{{ year }}</span>
          <div class="heatmap-cell-row">
            <div
              v-for="month in 12"
              :key="month"
              class="heatmap-cell"
              :class="
                getColorClass(
                  heatmapData.find(
                    (c) => c.year === year && c.month === month,
                  )?.count || 0,
                )
              "
              :title="
                getTooltip(
                  heatmapData.find(
                    (c) => c.year === year && c.month === month,
                  ) || { year, month, count: 0, label: `${year}-${String(month).padStart(2, '0')}` },
                )
              "
            />
          </div>
        </div>
      </div>
      <div class="heatmap-legend">
        <span class="legend-label">{{ t('stats.less') }}</span>
        <span class="heatmap-cell heat-0" />
        <span class="heatmap-cell heat-1" />
        <span class="heatmap-cell heat-2" />
        <span class="heatmap-cell heat-3" />
        <span class="heatmap-cell heat-4" />
        <span class="legend-label">{{ t('stats.more') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.year-heatmap {
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 1rem;
}

.section-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
  font-weight: 600;
}

.empty-hint {
  text-align: center;
  padding: 1rem 0;
}

.heatmap-grid {
  overflow-x: auto;
}

.heatmap-header {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  margin-bottom: 4px;
}

.year-label-spacer {
  width: 2.5rem;
  flex-shrink: 0;
}

.heatmap-cell-row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.month-label {
  text-align: center;
  font-size: 0.65rem;
  color: var(--el-text-color-placeholder);
  overflow: hidden;
  white-space: nowrap;
}

.heatmap-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.heatmap-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.year-label {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  width: 2.5rem;
  text-align: right;
  flex-shrink: 0;
}

.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 3px;
}

.heat-0 {
  background-color: var(--el-fill-color);
}

.heat-1 {
  background-color: var(--el-color-primary-light-7);
}

.heat-2 {
  background-color: var(--el-color-primary-light-5);
}

.heat-3 {
  background-color: var(--el-color-primary-light-3);
}

.heat-4 {
  background-color: var(--el-color-primary);
}

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  margin-top: 0.75rem;
}

.heatmap-cell:not(.heatmap-legend .heatmap-cell) {
  cursor: pointer;
  filter: brightness(1);
  transition: filter 0.15s ease, box-shadow 0.15s ease;
}

.heatmap-cell:not(.heatmap-legend .heatmap-cell):hover {
  filter: brightness(1.15);
  box-shadow: 0 0 0 2px var(--el-bg-color);
  z-index: 1;
  position: relative;
}

.heatmap-legend .heatmap-cell:hover {
  transform: none;
}

.legend-label {
  font-size: 0.7rem;
  color: var(--el-text-color-placeholder);
  margin: 0 4px;
}
</style>