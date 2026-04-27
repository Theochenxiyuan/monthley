<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MonthlyTrendItem } from '@/composables/useStats';

const props = defineProps<{
  trend: MonthlyTrendItem[];
  streakMonths: number;
}>();

const { t, locale } = useI18n();

const barLabels = computed(() =>
  props.trend.map((m) => m.month + '月'),
);

const barLabelsEn = computed(() =>
  props.trend.map((m) => {
    const date = new Date(m.year, m.month - 1, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  }),
);

const barColors = computed(() =>
  props.trend.map((m) => {
    if (m.rate === null) return 'var(--el-fill-color-light)';
    if (m.rate >= 80) return 'var(--el-color-success)';
    if (m.rate >= 50) return 'var(--el-color-warning)';
    return 'var(--el-color-danger)';
  }),
);

const rateColorClass = (rate: number | null) => {
  if (rate === null) return 'rate-empty';
  if (rate >= 80) return 'rate-high';
  if (rate >= 50) return 'rate-mid';
  return 'rate-low';
};
</script>

<template>
  <div class="monthly-trend">
    <h4 class="section-title">{{ t('stats.completionTrend') }}</h4>

    <div v-if="trend.length === 0" class="empty-hint">
      <el-text type="info" size="small">{{ t('stats.noData') }}</el-text>
    </div>

    <template v-else>
      <div class="trend-chart">
        <div class="bar-container">
          <div
            v-for="(item, index) in trend"
            :key="item.label"
            class="bar-column"
          >
            <div class="bar-area">
              <div
                v-if="item.rate !== null"
                class="bar"
                :style="{
                  height: Math.max(item.rate, 4) + '%',
                  backgroundColor: barColors[index],
                }"
              >
                <span class="rate-label" :class="rateColorClass(item.rate)">
                  {{ item.rate }}%
                </span>
              </div>
              <div v-else class="bar-empty-indicator">
                <span class="rate-label rate-empty">—</span>
              </div>
            </div>
          </div>
        </div>
        <div class="bar-labels">
          <span
            v-for="(label, index) in (locale === 'zh-CN' ? barLabels : barLabelsEn)"
            :key="index"
            class="bar-label"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <div v-if="streakMonths > 0" class="streak-info">
        <span class="streak-emoji">🔥</span>
        <span class="streak-text">
          {{ t('stats.streakMonths') }}{{ t('punctuation.colon') }}
          <strong>{{ streakMonths }}</strong> {{ t('stats.month') }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.monthly-trend {
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 1rem;
}

.section-title {
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
  font-weight: 600;
}

.empty-hint {
  text-align: center;
  padding: 1rem 0;
}

.trend-chart {
  position: relative;
}

.bar-container {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 140px;
  padding-bottom: 2px;
}

.bar-column {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  cursor: pointer;
}

.bar-area {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.bar {
  width: 100%;
  min-height: 4px;
  border-radius: 3px 3px 0 0;
  position: relative;
  transition: height 0.5s ease, background-color 0.3s ease;
}

.bar-column:hover .bar {
  filter: brightness(1.1);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.15);
}

.bar-empty-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  width: 100%;
}

.rate-label {
  font-size: 0.6rem;
  font-weight: 600;
  white-space: nowrap;
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
}

.rate-high {
  color: var(--el-color-success);
}

.rate-mid {
  color: var(--el-color-warning);
}

.rate-low {
  color: var(--el-color-danger);
}

.rate-empty {
  color: var(--el-text-color-placeholder);
}

.bar-labels {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.bar-label {
  flex: 1;
  text-align: center;
  font-size: 0.6rem;
  color: var(--el-text-color-placeholder);
  overflow: hidden;
  white-space: nowrap;
}

.streak-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.75rem;
  padding: 0.5rem;
  background-color: var(--el-color-warning-light-9);
  border-radius: 6px;
}

.streak-emoji {
  font-size: 1.1rem;
}

.streak-text {
  font-size: 0.85rem;
  color: var(--el-text-color-regular);
}
</style>