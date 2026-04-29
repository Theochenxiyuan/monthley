<script setup lang="ts">
import type { EntryStatus, EntryType, TimelineMonth } from '@/types/models';
import EntryItem from './EntryItem.vue';
import { useDialogStore } from '@/stores/dialog';
import { useTimelineStore } from '@/stores/timeline';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatYearMonth, isCurrentMonth } from '@/utils/dateFormatter';
import { computed, ref, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useFiltersStore } from '@/stores/filters';
import Draggable from 'vuedraggable';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const settingsStore = useSettingsStore();
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();
const filtersStore = useFiltersStore();
const props = defineProps<{
  month: TimelineMonth;
  highlightEntryId?: string;
  forceExpand?: boolean;
}>();
// 过去月份是否全部已完成
function isPastMonthFullyCompleted(month: TimelineMonth): boolean {
  const now = new Date();
  const isPastMonth =
    month.year < now.getFullYear() ||
    (month.year === now.getFullYear() && month.month < now.getMonth() + 1);

  return (
    isPastMonth && month.entries.every((entry) => entry.status === 'completed')
  );
}

// 未来月份是否全部未开始
function isFutureMonthAllNotStarted(month: TimelineMonth): boolean {
  const now = new Date();
  const isFutureMonth =
    month.year > now.getFullYear() ||
    (month.year === now.getFullYear() && month.month > now.getMonth() + 1);

  return (
    isFutureMonth &&
    month.entries.every((entry) => entry.status === 'not_started')
  );
}
function shouldExpandMonth(month: TimelineMonth): boolean {
  if (
    isCurrentMonth(props.month) || // 当前月
    month.entries.length === 0 ||
    props.month.entries.some((e) => e.status === 'in_progress') // 有进行中
  )
    return true;

  // 自动折叠的情况
  if (
    isPastMonthFullyCompleted(props.month) ||
    isFutureMonthAllNotStarted(props.month)
  )
    return false;

  // 默认展开其他情况（比如过去月份有未开始/进行中的遗留条目）
  return true;
}

const manualExpanded = ref(
  shouldExpandMonth(props.month) || settingsStore.expandAll,
);

watch(
  () => settingsStore.expandAll,
  (val) => {
    manualExpanded.value = val || shouldExpandMonth(props.month);
  },
);

watch(
  () => props.forceExpand,
  (val) => {
    if (val) {
      manualExpanded.value = true;
    }
  },
);

watch(
  () => props.month.entries,
  () => {
    if (shouldExpandMonth(props.month)) {
      manualExpanded.value = true;
    }
  },
  { deep: true },
);

const isExpanded = computed(() => {
  if (props.forceExpand) return true;
  if (filtersStore.isActive) return true;
  return manualExpanded.value;
});

const canCollapse = computed(() => {
  return !isCurrentMonth(props.month) && props.month.entries.length > 0;
});

const isPastIncomplete = computed(() => {
  const now = new Date();
  const isPast =
    props.month.year < now.getFullYear() ||
    (props.month.year === now.getFullYear() && props.month.month < now.getMonth() + 1);
  return isPast && props.month.entries.some((e) => e.status !== 'completed');
});

const handleDelete = (entryId: string): void => {
  ElMessageBox.confirm(
    t('monthCard.confirmDelete'),
    t('monthCard.deleteEntry'),
    {
      confirmButtonText: t('monthCard.confirm'),
      cancelButtonText: t('monthCard.cancel'),
      type: 'info',
    },
  )
    .then(() => {
      timelineStore.deleteEntry(
        { year: props.month.year, month: props.month.month },
        entryId,
      );
      ElMessage({
        type: 'success',
        message: t('monthCard.deleteSuccess'),
      });
    })
    .catch(() => {});
};

function shouldHideEntry(type: EntryType, status: EntryStatus): boolean {
  const { isTypeFilterActive, activeFilters, isStatusFilterActive } =
    filtersStore;

  const typeCondition = isTypeFilterActive
    ? !activeFilters.type.includes(type)
    : false;

  const statusCondition = isStatusFilterActive
    ? !activeFilters.status.includes(status)
    : false;

  return typeCondition || statusCondition;
}

const hiddenCount = computed(() => {
  if (!filtersStore.isActive) return 0;

  const { isTypeFilterActive, activeFilters, isStatusFilterActive } =
    filtersStore;

  return props.month.entries.reduce((count, entry) => {
    const shouldHide =
      (isTypeFilterActive && !activeFilters.type.includes(entry.type)) ||
      (isStatusFilterActive && !activeFilters.status.includes(entry.status));

    return count + (shouldHide ? 1 : 0);
  }, 0);
});

const getTextType = (): 'success' | 'info' | 'primary' => {
  return isPastMonthFullyCompleted(props.month)
    ? 'success'
    : isFutureMonthAllNotStarted(props.month)
      ? 'info'
      : 'primary';
};

const typeCounts = computed(() => {
  const counts: Record<string, number> = {};
  props.month.entries.forEach((entry) => {
    counts[entry.type] = (counts[entry.type] || 0) + 1;
  });
  return counts;
});

const collapsedSummary = computed(() => {
  const total = props.month.entries.length;
  const completed = props.month.entries.filter((e) => e.status === 'completed').length;
  const inProgress = props.month.entries.filter((e) => e.status === 'in_progress').length;
  const isZh = locale.value === 'zh-CN';

  let prefix = '';
  if (isPastMonthFullyCompleted(props.month)) {
    prefix = `${t('monthCard.completed')} ${completed}/${total}`;
  } else if (inProgress > 0) {
    prefix = `${t('monthCard.inProgress')} ${inProgress}/${total}`;
  } else if (isFutureMonthAllNotStarted(props.month)) {
    prefix = `${t('monthCard.planned')} ${total}${t('unit.count')}`;
  } else {
    prefix = `${t('monthCard.completed')} ${completed}/${total}`;
  }

  const typesWithCount = Object.entries(typeCounts.value)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const remainingCount = Object.keys(typeCounts.value).length - typesWithCount.length;

  const parts = typesWithCount.map(([type, count]) => {
    const label = t(`entry.shortTypes.${type as EntryType}`);
    return isZh ? `${label} ${count}` : `${label} (${count})`;
  });

  let suffix = parts.join(isZh ? ' ' : ', ');

  if (remainingCount > 0) {
    suffix += isZh
      ? ` ${t('monthCard.andMore', { count: remainingCount })}`
      : `, ${t('monthCard.andMore', { count: remainingCount })}`;
  }

  return suffix ? `${prefix} · ${suffix}` : prefix;
});
</script>

<template>
  <div class="month-card-wrapper">
    <span v-if="isPastIncomplete" class="past-incomplete-badge">
      <el-icon size="12"><WarningFilled /></el-icon>
      {{ t('monthCard.incompletePlans') }}
    </span>
    <button
      v-if="isExpanded && canCollapse"
      class="card-collapse-btn"
      @click.stop="manualExpanded = false"
    >
      {{ t('monthCard.collapse') }}
      <el-icon size="12"><ArrowUp /></el-icon>
    </button>

    <ElCard
      :body-style="{
        padding: '0',
      }"
    >
      <div v-auto-animate>
        <Draggable
        v-model="month.entries"
        group="timeline"
        item-key="id"
        :style="{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
          padding: '1rem',
        }"
        @change="
          manualExpanded = true;
          timelineStore.lastUpdated = new Date();
          timelineStore.saveLocal();
        "
        :delay="300"
        :delayOnTouchOnly="true"
        drag-class="drag"
        ghost-class="ghost"
        chosen-class="chosen"
        :animation="300"
        v-if="isExpanded"
      >
        <template #item="entry">
          <div
            style="order: 1"
            v-show="!shouldHideEntry(entry.element.type, entry.element.status)"
            :class="{ 'entry-highlight': entry.element.id === highlightEntryId }"
          >
            <el-dropdown
              placement="bottom"
              trigger="click"
              size="large"
              teleported
            >
              <EntryItem :entry="entry.element" :warning-highlight="isPastIncomplete && entry.element.status !== 'completed'" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="entry.element.status !== 'completed'"
                    @click="
                      timelineStore.toNextStatus(
                        { year: month.year, month: month.month },
                        entry.element.id,
                      )
                    "
                    ><el-text
                      size="large"
                      :type="
                        entry.element.status === 'in_progress'
                          ? 'success'
                          : 'primary'
                      "
                      >{{
                        entry.element.status === 'in_progress'
                          ? t('monthCard.complete')
                          : t('monthCard.start')
                      }}</el-text
                    ></el-dropdown-item
                  >
                  <el-dropdown-item
                    @click="
                      dialogStore.open(
                        {
                          month: new Date(formatYearMonth(month)),
                          ...entry.element,
                        },
                        entry.element.id,
                      )
                    "
                    ><el-text size="large" type="warning">{{
                      t('monthCard.edit')
                    }}</el-text></el-dropdown-item
                  >
                  <el-dropdown-item @click="handleDelete(entry.element.id)"
                    ><el-text size="large" type="danger">{{
                      t('monthCard.delete')
                    }}</el-text></el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #footer>
          <div
            v-show="month.entries.length === 0 && !isCurrentMonth(month)"
            style="order: 2"
          >
            <el-text type="warning"
              ><el-icon><InfoFilled /></el-icon>
              {{ t('monthCard.emptyMonth') }}</el-text
            >
          </div>

          <div v-show="hiddenCount > 0" style="order: 2">
            <el-text type="warning" size="small"
              >({{ hiddenCount }} {{ t('monthCard.hiddenEntries') }})</el-text
            >
          </div>

          <ElButton
            type="primary"
            text
            size="small"
            @click="
              dialogStore.open({ month: new Date(formatYearMonth(month)) })
            "
            style="order: 2"
          >
            <el-icon size="18"><Plus /></el-icon>
          </ElButton>
        </template>
      </Draggable>

      <div
        :style="{
          display: 'flex',
          flexWrap: 'nowrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '0.75rem 1rem',
        }"
        @click="canCollapse && (manualExpanded = !manualExpanded)"
        v-else
      >
        <el-text line-clamp="1" :type="getTextType()" class="collapsed-summary">
          {{ collapsedSummary }}
        </el-text>

        <el-text type="primary" size="small"
          ><el-icon size="18"><ArrowDown /></el-icon
        ></el-text>
      </div>
    </div>
    </ElCard>
  </div>
</template>

<style scoped>
.month-card-wrapper {
  position: relative;
}
.drag > div {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  opacity: 0.9;
  z-index: 100;
}
.chosen > div {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  opacity: 1;
}
.chosen > div::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid var(--el-color-primary);
  border-radius: 8px;
  pointer-events: none;
}
.ghost {
  background: var(--el-color-primary-light-8);
  border-radius: 6px;
  outline: 2px dashed var(--el-color-primary);
  opacity: 0.6;
}
.ghost > div {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.15s ease-out;
}
.entry-highlight :deep(.entry-item) {
  animation: highlight-pulse 2s ease-out;
}
@keyframes highlight-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--el-color-primary);
  }
  25% {
    box-shadow: 0 0 0 6px var(--el-color-primary-light-5);
  }
  100% {
    box-shadow: none;
  }
}
.collapsed-summary {
  font-size: 0.85rem;
  line-height: 1.5;
}

.card-collapse-btn {
  position: absolute;
  bottom: -14px;
  right: 0;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-card-bg-color, var(--el-bg-color));
  color: var(--el-text-color-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.card-collapse-btn:hover {
  background: var(--el-fill-color);
  color: var(--el-color-primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.past-incomplete-badge {
  position: absolute;
  top: -14px;
  right: 0;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 4px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
  font-size: 0.75rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
</style>
