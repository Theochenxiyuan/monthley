<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { StatusStat } from '@/composables/useStats';

const props = defineProps<{
  statusStats: StatusStat[];
  totalCount: number;
}>();

const { t } = useI18n();

const circumference = 2 * Math.PI * 40;

const statusConfig: Record<string, { color: string; label: string }> = {
  completed: { color: '#67C23A', label: 'entry.statuses.completed' },
  in_progress: { color: '#409EFF', label: 'entry.statuses.in_progress' },
  not_started: { color: '#909399', label: 'entry.statuses.not_started' },
};

const segments = computed(() => {
  if (props.totalCount === 0) return [];
  let offset = 0;
  return props.statusStats
    .filter((s) => s.count > 0)
    .map((s) => {
      const pct = s.count / props.totalCount;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const entry = {
        status: s.status,
        dash,
        gap,
        offset,
        style: {
          strokeDasharray: `${dash} ${gap}`,
          strokeDashoffset: -offset,
        },
      };
      offset += dash;
      return entry;
    });
});

const animated = ref(false);
onMounted(() => {
  requestAnimationFrame(() => {
    animated.value = true;
  });
});
</script>

<template>
  <div class="status-ring-section">
    <h4 class="section-title">{{ t('stats.statusDistribution') }}</h4>
    <div class="status-ring-container">
      <div class="ring-wrapper">
        <svg
          viewBox="0 0 100 100"
          class="ring-svg"
          :class="{ 'ring-svg--animate': animated }"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            :stroke="'var(--el-fill-color)'"
            stroke-width="12"
          />
          <circle
            v-for="seg in segments"
            :key="seg.status"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            :stroke="statusConfig[seg.status].color"
            stroke-width="12"
            :stroke-dasharray="seg.style.strokeDasharray"
            :stroke-dashoffset="seg.style.strokeDashoffset"
            class="ring-segment"
          />
        </svg>
        <div class="ring-center">
          <span class="ring-total">{{ totalCount }}</span>
          <span class="ring-label">{{ t('stats.totalEntries') }}</span>
        </div>
      </div>
      <div class="status-legend">
        <div
          v-for="stat in statusStats"
          :key="stat.status"
          class="legend-item"
        >
          <span
            class="legend-dot"
            :style="{ backgroundColor: statusConfig[stat.status].color }"
          />
          <span class="legend-label">
            {{ t(statusConfig[stat.status].label) }}
          </span>
          <span class="legend-value">
            {{ stat.count }}
            <span class="legend-percent">({{ stat.percentage }}%)</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-ring-section {
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

.status-ring-container {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.ring-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 100px;
  height: 100px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-segment {
  transition: stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease;
}

.ring-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-total {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.ring-label {
  font-size: 0.6rem;
  color: var(--el-text-color-secondary);
}

.status-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.legend-value {
  color: var(--el-text-color-secondary);
  margin-left: auto;
  font-size: 0.8rem;
}

.legend-percent {
  color: var(--el-text-color-placeholder);
  font-size: 0.75rem;
}
</style>