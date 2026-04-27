<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTimelineStore } from '@/stores/timeline';
import { Icon } from '@iconify/vue';
import { formatMonth } from '@/utils/dateFormatter';
import type { EntryType } from '@/types/models';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'select-entry', entryId: string, year: number, month: number): void;
}>();

const { t } = useI18n();
const timelineStore = useTimelineStore();
const searchText = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const iconMap: Record<string, string> = {
  learn: 'mdi:school',
  play: 'codicon:game',
  watch: 'mdi:filmstrip',
  read: 'mdi:book-open-page-variant',
};

interface SearchResult {
  entryId: string;
  entryName: string;
  entryType: EntryType;
  year: number;
  month: number;
  monthLabel: string;
}

const searchResults = computed<SearchResult[]>(() => {
  const query = searchText.value.trim().toLowerCase();
  if (!query) return [];

  const results: SearchResult[] = [];
  const months = timelineStore.allMonths;

  for (const m of months) {
    for (const entry of m.entries) {
      if (entry.name.toLowerCase().includes(query)) {
        results.push({
          entryId: entry.id,
          entryName: entry.name,
          entryType: entry.type,
          year: m.year,
          month: m.month,
          monthLabel: formatMonth(m),
        });
      }
    }
  }

  return results.slice(0, 50);
});

const highlightText = (text: string, query: string): string => {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
};

function handleSelect(result: SearchResult) {
  emit('select-entry', result.entryId, result.year, result.month);
  isOpen.value = false;
  searchText.value = '';
}

watch(isOpen, (val) => {
  if (val) {
    searchText.value = '';
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    isOpen.value = !isOpen.value;
  }
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <el-drawer
    v-model="isOpen"
    :title="t('search.title')"
    direction="ttb"
    size="auto"
    :show-close="true"
    :append-to-body="true"
    class="search-drawer"
  >
    <div class="search-panel">
      <el-input
        ref="inputRef"
        v-model="searchText"
        :placeholder="t('search.placeholder')"
        size="large"
        clearable
        :prefix-icon="Search"
        class="search-input"
      />

      <div v-if="searchText.trim() && searchResults.length === 0" class="search-empty">
        <el-text type="info">{{ t('search.noResults') }}</el-text>
      </div>

      <div v-else-if="searchResults.length > 0" class="search-results">
        <div
          v-for="result in searchResults"
          :key="result.entryId"
          class="search-result-item"
          @click="handleSelect(result)"
        >
          <Icon :icon="iconMap[result.entryType]" width="18" class="result-icon" />
          <div class="result-content">
            <span
              class="result-name"
              v-html="highlightText(result.entryName, searchText.trim())"
            />
            <span class="result-month">{{ result.monthLabel }}</span>
          </div>
        </div>
        <div class="search-footer">
          <el-text type="info" size="small">
            {{ t('search.resultCount', { count: searchResults.length }) }}
          </el-text>
        </div>
      </div>

      <div v-else class="search-hint">
        <Icon icon="mdi:magnify" width="48" style="color: var(--el-text-color-placeholder)" />
        <el-text type="info" size="small">{{ t('search.hint') }}</el-text>
      </div>
    </div>
  </el-drawer>
</template>

<script lang="ts">
import { Search } from '@element-plus/icons-vue';
export default {
  components: { Search },
};
</script>

<style scoped>
.search-panel {
  padding: 0 0.5rem;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.search-input {
  margin-bottom: 0.75rem;
}

.search-results {
  overflow-y: auto;
  flex: 1;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.search-result-item:hover {
  background-color: var(--el-fill-color);
}

.search-result-item:active {
  background-color: var(--el-fill-color-dark);
}

.result-icon {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.result-content {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.result-name {
  color: var(--el-text-color-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-month {
  color: var(--el-text-color-placeholder);
  font-size: 0.8rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.search-empty {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.search-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 0;
}

.search-footer {
  text-align: center;
  padding: 0.5rem 0;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>

<style>
.search-highlight {
  background-color: var(--el-color-primary-light-7);
  color: inherit;
  padding: 0 1px;
  border-radius: 2px;
  font-weight: 600;
}
</style>