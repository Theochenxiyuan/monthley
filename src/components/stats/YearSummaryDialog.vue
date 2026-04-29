<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Icon } from '@iconify/vue';
import html2canvas from 'html2canvas';
import { useYearSummary } from '@/composables/useYearSummary';
import type { YearData } from '@/composables/useYearSummary';
import type { EntryType } from '@/types/models';
import { entryTypes } from '@/types/models';

const props = defineProps<{
  modelValue: boolean;
  initialYear: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t, locale } = useI18n();

const currentYear = ref(props.initialYear);
const { yearData, availableYears } = useYearSummary(currentYear);

const typeColors: Record<string, string> = {
  learn: '#409EFF',
  play: '#67C23A',
  watch: '#E6A23C',
  read: '#F56C6C',
};

const typeIcons: Record<string, string> = {
  learn: 'mdi:school',
  play: 'mdi:gamepad-variant',
  watch: 'mdi:movie-open',
  read: 'mdi:book-open-page-variant',
};

const typePercentages = computed(() => {
  if (!yearData.value) return {};
  const total = yearData.value.total || 1;
  const result: Record<string, number> = {};
  for (const type of entryTypes) {
    result[type] = Math.round((yearData.value.typeBreakdown[type] / total) * 100);
  }
  return result;
});

const topMonthLabel = computed(() => {
  if (!yearData.value?.topMonth) return '';
  return new Intl.DateTimeFormat(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'long',
  }).format(new Date(yearData.value.year, yearData.value.topMonth.month - 1, 1));
});

const canGoBack = computed(() => {
  if (availableYears.value.length === 0) return false;
  return currentYear.value > availableYears.value[0];
});

const canGoForward = computed(() => {
  if (availableYears.value.length === 0) return false;
  return currentYear.value < availableYears.value[availableYears.value.length - 1];
});

function prevYear() {
  if (canGoBack.value) currentYear.value--;
}

function nextYear() {
  if (canGoForward.value) currentYear.value++;
}

const summaryCard = ref<HTMLElement | null>(null);
const isSharing = ref(false);

async function shareAsImage() {
  if (!summaryCard.value || isSharing.value) return;
  isSharing.value = true;

  try {
    const canvas = await html2canvas(summaryCard.value, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `monthley-${currentYear.value}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: `Monthley ${currentYear.value}`,
            files: [file],
          });
        } catch {
          downloadBlob(blob);
        }
      } else {
        downloadBlob(blob);
      }
    }, 'image/png');
  } finally {
    isSharing.value = false;
  }
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `monthley-${currentYear.value}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

function getBarWidth(data: YearData, type: EntryType): string {
  const max = Math.max(...entryTypes.map((t) => data.typeBreakdown[t]), 1);
  return `${(data.typeBreakdown[type] / max) * 100}%`;
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="t('yearSummary.title')"
    width="min(94%, 420px)"
    class="summary-dialog"
    top="4vh"
    :close-on-click-modal="true"
    destroy-on-close
  >
    <div v-if="!yearData" class="summary-empty">
      <Icon icon="mdi:calendar-blank" width="48" style="color: var(--el-text-color-placeholder)" />
      <p>{{ t('yearSummary.noData') }}</p>
    </div>

    <template v-else>
      <div class="year-nav">
        <el-button :icon="canGoBack ? 'ArrowLeft' : ''" :disabled="!canGoBack" text @click="prevYear">
          <Icon v-if="!canGoBack" icon="" />
          <Icon v-else icon="mdi:chevron-left" width="20" />
        </el-button>
        <span class="year-nav-label">{{ currentYear }}</span>
        <el-button :disabled="!canGoForward" text @click="nextYear">
          <Icon icon="mdi:chevron-right" width="20" />
        </el-button>
      </div>

      <div ref="summaryCard" class="summary-card">
        <div class="summary-header">
          <Icon icon="mdi:star-four-points" width="20" class="summary-header-icon" />
          <span class="summary-title">{{ t('yearSummary.heading', { year: currentYear }) }}</span>
        </div>

        <div class="summary-grid">
          <div class="summary-stat">
            <span class="summary-stat-value summary-stat-value--primary">{{ yearData.total }}</span>
            <span class="summary-stat-label">{{ t('yearSummary.totalPlans') }}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-value summary-stat-value--warning">{{ yearData.completionRate }}%</span>
            <span class="summary-stat-label">{{ t('yearSummary.completionRate') }}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-value summary-stat-value--info">{{ yearData.activeMonths }}</span>
            <span class="summary-stat-label">{{ t('yearSummary.activeMonths') }}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-value summary-stat-value--success">{{ yearData.streakMonths }}</span>
            <span class="summary-stat-label">{{ t('yearSummary.streakMonths') }}</span>
          </div>
        </div>

        <div class="summary-types">
          <div v-for="type in entryTypes" :key="type" class="summary-type-row">
            <Icon :icon="typeIcons[type]" width="18" :style="{ color: typeColors[type] }" />
            <span class="summary-type-label">{{ t(`entry.shortTypes.${type}`) }}</span>
            <div class="summary-type-bar-bg">
              <div
                class="summary-type-bar"
                :style="{ width: getBarWidth(yearData, type), backgroundColor: typeColors[type] }"
              />
            </div>
            <span class="summary-type-count">{{ yearData.typeBreakdown[type] }}</span>
          </div>
        </div>

        <div v-if="yearData.topMonth" class="summary-highlight">
          <Icon icon="mdi:trophy" width="18" style="color: #e6a23c" />
          <span>
            {{ t('yearSummary.topMonth', { month: topMonthLabel, count: yearData.topMonth.count }) }}
          </span>
        </div>

        <div class="summary-footer">
          <span>Monthley</span>
        </div>
      </div>

      <el-button
        type="primary"
        class="share-btn"
        :loading="isSharing"
        @click="shareAsImage"
      >
        <Icon icon="mdi:share-variant" width="16" />
        <span>{{ t('yearSummary.share') }}</span>
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.summary-dialog :deep(.el-dialog__body) {
  padding: 0 16px 16px;
}

.summary-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 30vh;
  gap: 0.75rem;
  color: var(--el-text-color-secondary);
}

.year-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.year-nav-label {
  font-size: 1.25rem;
  font-weight: 700;
  min-width: 4rem;
  text-align: center;
}

.summary-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 1.25rem;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.summary-header-icon {
  color: #e6a23c;
}

.summary-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 0.75rem 0.6rem;
}

.summary-stat-value {
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.summary-stat-value--success {
  color: var(--el-color-success);
}

.summary-stat-value--primary {
  color: var(--el-color-primary);
}

.summary-stat-value--warning {
  color: var(--el-color-warning);
}

.summary-stat-value--info {
  color: var(--el-color-info);
}

.summary-stat-value--success {
  color: var(--el-color-success);
}

.summary-stat-label {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  margin-top: 0.25rem;
  text-align: center;
  line-height: 1.2;
}

.summary-types {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.summary-type-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.summary-type-label {
  font-size: 0.8rem;
  color: var(--el-text-color-primary);
  font-weight: 500;
  white-space: nowrap;
  min-width: 2rem;
}

.summary-type-bar-bg {
  flex: 1;
  height: 8px;
  background: var(--el-fill-color);
  border-radius: 4px;
  overflow: hidden;
}

.summary-type-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.summary-type-count {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  width: 2rem;
  text-align: right;
}

.summary-highlight {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--el-text-color-regular);
  padding: 0.5rem 0;
  justify-content: center;
}

.summary-footer {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: var(--el-text-color-placeholder);
  letter-spacing: 0.5px;
}

.share-btn {
  width: 100%;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}
</style>