<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';
import html2canvas from 'html2canvas';
import { useYearSummary } from '@/composables/useYearSummary';
import type { YearData } from '@/composables/useYearSummary';
import type { EntryType } from '@/types/models';
import { entryTypes } from '@/types/models';
import { useTimelineStore } from '@/stores/timeline';
import { supabase } from '@/lib/supabase';

const props = defineProps<{
  modelValue: boolean;
  initialYear: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t, locale } = useI18n();
const timelineStore = useTimelineStore();

const currentYear = ref(props.initialYear);
const { yearData, availableYears } = useYearSummary(currentYear);
const activeTab = ref<'ai' | 'stats'>('ai');

interface AiYearSummary {
  title: string;
  overview: string;
  highlights: string[];
  patterns: string[];
  suggestions: string[];
}

interface CachedAiYearSummary {
  year: number;
  generatedAt: string;
  inputHash: string;
  result: AiYearSummary;
}

interface AiSummaryResponse {
  data: AiYearSummary;
}

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

const yearMonths = computed(() => (
  timelineStore.allMonths
    .filter((month) => month.year === currentYear.value && month.entries.length > 0)
    .map((month) => ({
      month: month.month,
      entries: month.entries.map((entry) => ({
        title: entry.name,
        type: entry.type,
        status: entry.status,
        notes: entry.notes || undefined,
      })),
    }))
));

const aiPayload = computed(() => ({
  year: currentYear.value,
  locale: locale.value === 'zh-CN' ? 'zh-CN' : 'en-US',
  stats: yearData.value
    ? {
        total: yearData.value.total,
        completed: yearData.value.completed,
        inProgress: yearData.value.inProgress,
        notStarted: yearData.value.notStarted,
        completionRate: yearData.value.completionRate,
        activeMonths: yearData.value.activeMonths,
        streakMonths: yearData.value.streakMonths,
        typeBreakdown: yearData.value.typeBreakdown,
        topMonth: yearData.value.topMonth,
      }
    : null,
  months: yearMonths.value,
}));

const currentInputHash = computed(() => createSimpleHash(JSON.stringify(aiPayload.value)));
const cacheKey = computed(() => `aiYearSummary:${locale.value}:${currentYear.value}`);

const aiSummary = ref<CachedAiYearSummary | null>(null);
const isGeneratingAi = ref(false);
const isSharingAi = ref(false);
const aiCard = ref<HTMLElement | null>(null);

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

watch(cacheKey, loadCachedAiSummary, { immediate: true });

function createSimpleHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function loadCachedAiSummary() {
  const cached = localStorage.getItem(cacheKey.value);
  if (!cached) {
    aiSummary.value = null;
    return;
  }

  try {
    const parsed = JSON.parse(cached) as CachedAiYearSummary;
    aiSummary.value = parsed.year === currentYear.value ? parsed : null;
  } catch {
    aiSummary.value = null;
  }
}

function saveAiSummary(result: AiYearSummary) {
  aiSummary.value = {
    year: currentYear.value,
    generatedAt: new Date().toISOString(),
    inputHash: currentInputHash.value,
    result,
  };
  localStorage.setItem(cacheKey.value, JSON.stringify(aiSummary.value));
}

async function generateAiSummary() {
  if (!yearData.value || isGeneratingAi.value) return;
  if (!supabase) {
    ElMessage.error(t('sync.errorNotConfigured'));
    return;
  }

  isGeneratingAi.value = true;
  try {
    const { data, error } = await supabase.functions.invoke<AiSummaryResponse>('generate-year-summary', {
      body: aiPayload.value,
    });

    if (error) throw error;
    if (!data?.data) throw new Error('AI summary response is empty');

    saveAiSummary(data.data);
    ElMessage.success(t('yearSummary.aiGenerated'));
  } catch (error) {
    console.error('AI year summary failed:', error);
    ElMessage.error(t('yearSummary.aiFailed'));
  } finally {
    isGeneratingAi.value = false;
  }
}

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

function formatAiGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getAiShareText(): string {
  if (!aiSummary.value) return '';
  const result = aiSummary.value.result;
  const sections = [
    `# ${result.title}`,
    '',
    result.overview,
    '',
    `## ${t('yearSummary.aiHighlights')}`,
    ...result.highlights.map((item) => `- ${item}`),
    '',
    `## ${t('yearSummary.aiPatterns')}`,
    ...result.patterns.map((item) => `- ${item}`),
    '',
    `## ${t('yearSummary.aiSuggestions')}`,
    ...result.suggestions.map((item) => `- ${item}`),
  ];
  return sections.join('\n');
}

async function copyAiSummary() {
  const text = getAiShareText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('yearSummary.copySuccess'));
  } catch {
    ElMessage.error(t('yearSummary.copyFailed'));
  }
}

async function shareAiAsImage() {
  if (!aiCard.value || isSharingAi.value) return;
  isSharingAi.value = true;

  const card = aiCard.value;
  const clone = card.cloneNode(true) as HTMLElement;
  const { width } = card.getBoundingClientRect();

  clone.classList.add('ai-summary-card--capture');
  Object.assign(clone.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${width}px`,
    height: 'auto',
    maxHeight: 'none',
    overflow: 'visible',
    zIndex: '-1',
  });
  document.body.appendChild(clone);

  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(clone, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `monthley-ai-${currentYear.value}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: `Monthley AI ${currentYear.value}`,
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
    clone.remove();
    isSharingAi.value = false;
  }
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
    <div v-if="availableYears.length > 0" class="summary-sticky-header">
      <div class="year-nav">
        <el-button
          class="year-nav-btn"
          :disabled="!canGoBack"
          text
          @click="prevYear"
        >
          <Icon icon="mdi:chevron-left" width="20" />
        </el-button>

        <el-select
          v-model="currentYear"
          class="year-select"
          size="small"
          :teleported="false"
        >
          <el-option
            v-for="year in availableYears"
            :key="year"
            :label="String(year)"
            :value="year"
          />
        </el-select>

        <el-button
          class="year-nav-btn"
          :disabled="!canGoForward"
          text
          @click="nextYear"
        >
          <Icon icon="mdi:chevron-right" width="20" />
        </el-button>
      </div>

      <div v-if="yearData" class="summary-tab-switch" role="tablist">
        <button
          type="button"
          class="summary-tab-btn"
          :class="{ 'summary-tab-btn--active': activeTab === 'ai' }"
          role="tab"
          :aria-selected="activeTab === 'ai'"
          @click="activeTab = 'ai'"
        >
          {{ t('yearSummary.aiTab') }}
        </button>
        <button
          type="button"
          class="summary-tab-btn"
          :class="{ 'summary-tab-btn--active': activeTab === 'stats' }"
          role="tab"
          :aria-selected="activeTab === 'stats'"
          @click="activeTab = 'stats'"
        >
          {{ t('yearSummary.statsTab') }}
        </button>
      </div>
    </div>

    <div v-if="!yearData" class="summary-empty">
      <Icon icon="mdi:calendar-blank" width="48" style="color: var(--el-text-color-placeholder)" />
      <p>{{ t('yearSummary.noData') }}</p>
    </div>

    <template v-else>
      <div class="summary-tab-content">
        <div v-if="activeTab === 'ai'">
          <div class="ai-panel">
            <div v-if="!aiSummary" class="ai-empty-card">
              <Icon icon="mdi:sparkles" width="42" class="ai-empty-icon" />
              <h3>{{ t('yearSummary.aiEmptyTitle') }}</h3>
              <p>{{ t('yearSummary.aiEmptyDescription') }}</p>
              <p class="ai-privacy-note">{{ t('yearSummary.aiPrivacyNote') }}</p>
            </div>

            <template v-else>
              <div
                ref="aiCard"
                class="ai-summary-card"
              >
                <div class="ai-card-kicker">Monthley AI</div>
                <h3>{{ aiSummary.result.title }}</h3>
                <p class="ai-generated-at">
                  {{ t('yearSummary.generatedAt', { time: formatAiGeneratedAt(aiSummary.generatedAt) }) }}
                </p>
                <p class="ai-overview">{{ aiSummary.result.overview }}</p>

                <section class="ai-section">
                  <h4>{{ t('yearSummary.aiHighlights') }}</h4>
                  <ul>
                    <li v-for="item in aiSummary.result.highlights" :key="item">{{ item }}</li>
                  </ul>
                </section>

                <section class="ai-section">
                  <h4>{{ t('yearSummary.aiPatterns') }}</h4>
                  <ul>
                    <li v-for="item in aiSummary.result.patterns" :key="item">{{ item }}</li>
                  </ul>
                </section>

                <section class="ai-section">
                  <h4>{{ t('yearSummary.aiSuggestions') }}</h4>
                  <ul>
                    <li v-for="item in aiSummary.result.suggestions" :key="item">{{ item }}</li>
                  </ul>
                </section>

                <p v-if="aiSummary.inputHash !== currentInputHash" class="ai-stale-note">
                  {{ t('yearSummary.aiStaleNote') }}
                </p>

              </div>

            </template>
          </div>
        </div>

        <div v-else>
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
              <span>{{ t('app.brand') }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-if="yearData" #footer>
      <div class="summary-footer-actions">
        <template v-if="activeTab === 'ai'">
          <el-button
            v-if="!aiSummary"
            type="primary"
            :loading="isGeneratingAi"
            @click="generateAiSummary"
          >
            <Icon icon="mdi:creation" width="16" />
            <span>{{ t('yearSummary.generateAi') }}</span>
          </el-button>

          <template v-else>
            <el-button class="ai-action-primary" :loading="isGeneratingAi" @click="generateAiSummary">
              <Icon icon="mdi:refresh" width="16" />
              <span>{{ t('yearSummary.regenerateAi') }}</span>
            </el-button>
            <el-button @click="copyAiSummary">
              <Icon icon="mdi:content-copy" width="16" />
              <span>{{ t('yearSummary.copyAi') }}</span>
            </el-button>
            <el-button type="primary" :loading="isSharingAi" @click="shareAiAsImage">
              <Icon icon="mdi:image" width="16" />
              <span>{{ t('yearSummary.shareAiImage') }}</span>
            </el-button>
          </template>
        </template>

        <el-button
          v-else
          type="primary"
          :loading="isSharing"
          @click="shareAsImage"
        >
          <Icon icon="mdi:share-variant" width="16" />
          <span>{{ t('yearSummary.share') }}</span>
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
:global(.summary-dialog.el-dialog) {
  max-height: calc(100vh - 8vh);
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:global(.summary-dialog.el-dialog .el-dialog__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 10px 12px;
  overflow: hidden;
}

:global(.summary-dialog.el-dialog .el-dialog__footer) {
  flex: 0 0 auto;
  padding: 10px 16px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-bg-color) 92%, transparent);
}

.summary-footer-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.summary-footer-actions .el-button {
  margin-left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.summary-footer-actions .el-button:only-child {
  grid-column: span 2;
}

.ai-action-primary {
  grid-column: span 2;
}

.summary-empty {
  display: flex;
  flex-direction: column;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  gap: 0.75rem;
  color: var(--el-text-color-secondary);
}

.summary-sticky-header {
  flex: 0 0 auto;
  z-index: 5;
  padding: 0 0 0.35rem;
  margin-bottom: 0.45rem;
  background: linear-gradient(
    to bottom,
    var(--el-bg-color) 0%,
    var(--el-bg-color) 82%,
    color-mix(in srgb, var(--el-bg-color) 0%, transparent) 100%
  );
}

.year-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  padding: 0.25rem;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  background: var(--el-fill-color-light);
}

.year-nav-btn {
  width: 32px;
  height: 32px;
  padding: 0 !important;
  border-radius: 999px;
}

.year-select {
  width: 104px;
}

.year-select :deep(.el-select__wrapper) {
  min-height: 32px;
  border-radius: 999px;
  padding-left: 24px;
  padding-right: 24px;
  box-shadow: none;
  background: var(--el-bg-color);
}

.year-select :deep(.el-select__selection) {
  justify-content: center;
}

.year-select :deep(.el-select__selected-item) {
  font-size: 1rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
  justify-content: center;
}

.summary-tab-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.summary-tab-btn {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  color: var(--el-text-color-secondary);
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.summary-tab-btn--active {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
}

.summary-tab-content {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.summary-tab-content > div {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.ai-panel {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.ai-empty-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 1.25rem;
  text-align: center;
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, transparent);
  border-radius: 18px;
  background:
    radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--el-color-primary) 14%, transparent), transparent 34%),
    linear-gradient(135deg, var(--el-bg-color), var(--el-fill-color-light));
}

.ai-empty-icon {
  color: var(--el-color-primary);
  margin-bottom: 0.75rem;
}

.ai-empty-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: var(--el-text-color-primary);
}

.ai-empty-card p {
  margin: 0 0 0.75rem;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.ai-privacy-note,
.ai-stale-note {
  font-size: 0.78rem;
  color: var(--el-text-color-placeholder) !important;
}

.ai-summary-card {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  border-radius: 8px;
  padding: 1.25rem;
  color: #1f2933;
  border: 1px solid rgba(92, 64, 38, 0.14);
  background:
    radial-gradient(circle at 10% 10%, rgba(255, 215, 137, 0.45), transparent 32%),
    radial-gradient(circle at 90% 0%, rgba(126, 169, 255, 0.28), transparent 30%),
    linear-gradient(145deg, #fff9ef 0%, #f6efe3 58%, #efe3d1 100%);
  box-shadow: 0 16px 40px rgba(84, 54, 28, 0.14);
}

.ai-summary-card::-webkit-scrollbar {
  display: none;
}

.ai-summary-card--capture {
  max-height: none !important;
  overflow-y: visible !important;
}

.ai-card-kicker {
  display: inline-flex;
  margin-bottom: 0.65rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  color: #8a5b1d;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ai-summary-card h3 {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.25;
}

.ai-generated-at {
  margin: 0.35rem 0 1rem;
  color: rgba(31, 41, 51, 0.58);
  font-size: 0.76rem;
}

.ai-overview {
  margin: 0 0 1rem;
  line-height: 1.75;
  font-size: 0.94rem;
}

.ai-section {
  padding: 0.85rem 0;
  border-top: 1px solid rgba(92, 64, 38, 0.12);
}

.ai-section h4 {
  margin: 0 0 0.5rem;
  color: #8a5b1d;
  font-size: 0.86rem;
}

.ai-section ul {
  margin: 0;
  padding-left: 1.1rem;
  line-height: 1.65;
}

.ai-section li + li {
  margin-top: 0.28rem;
}

.summary-card {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 1.25rem;
}

.summary-card::-webkit-scrollbar {
  display: none;
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

</style>
