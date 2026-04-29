<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TypeStat } from '@/composables/useStats';

const props = defineProps<{
  typeStats: TypeStat[];
}>();

const { t } = useI18n();

const circumference = 2 * Math.PI * 40;

const typeColors: Record<string, string> = {
  learn: '#409EFF',
  play: '#67C23A',
  watch: '#E6A23C',
  read: '#F56C6C',
};

const totalCount = computed(() =>
  props.typeStats.reduce((sum, s) => sum + s.count, 0),
);

const segments = computed(() => {
  if (totalCount.value === 0) return [];
  let offset = 0;
  return props.typeStats
    .filter((s) => s.count > 0)
    .map((s) => {
      const pct = s.count / totalCount.value;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const entry = {
        type: s.type,
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
  <div class="type-ring-section">
    <h4 class="section-title">{{ t('stats.typeDistribution') }}</h4>
    <div class="type-ring-container">
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
            :key="seg.type"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            :stroke="typeColors[seg.type]"
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
      <div class="type-legend">
        <div
          v-for="stat in typeStats"
          :key="stat.type"
          class="legend-item"
        >
          <span
            class="legend-dot"
            :style="{ backgroundColor: typeColors[stat.type] }"
          />
          <span class="legend-label">
            {{ t(`entry.shortTypes.${stat.type}`) }}
          </span>
          <span class="legend-value">
            {{ stat.count }}
            <span v-if="totalCount > 0" class="legend-percent">
              ({{ Math.round((stat.count / totalCount) * 100) }}%)
            </span>
          </span>
        </div>
      </div>
    </div>
    <div v-if="totalCount === 0" class="empty-hint">
      <el-text type="info" size="small">{{ t('stats.noData') }}</el-text>
    </div>
  </div>
</template>

<style scoped>
.type-ring-section {
  background-color: var(--el-fill-color-light);
  border-radius: 10px;
  padding: 1rem;
}

.section-title {
  margin: 0 0 0.75rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
  font-weight: 600;
}

.type-ring-container {
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

.type-legend {
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

.empty-hint {
  text-align: center;
  padding: 1rem 0;
}
</style>