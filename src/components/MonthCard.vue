<script setup lang="ts">
import type { EntryStatus, EntryType, TimelineMonth } from '@/types/models';
import EntryItem from './EntryItem.vue';
import { useDialogStore } from '@/stores/dialog';
import { useTimelineStore } from '@/stores/timeline';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatYearMonth, isCurrentMonth } from '@/utils/dateFormatter';
import { computed, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useFiltersStore } from '@/stores/filters';
import Draggable from 'vuedraggable';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const settingsStore = useSettingsStore();
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();
const filtersStore = useFiltersStore();
const props = defineProps<{
  month: TimelineMonth;
}>();

const typeMap = computed(() => ({
  learn: t('entryItem.types.learn'),
  play: t('entryItem.types.play'),
  watch: t('entryItem.types.watch'),
  read: t('entryItem.types.read'),
}));
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

const manualExpanded = ref(shouldExpandMonth(props.month)); // For manual toggle state

const isExpanded = computed(() => {
  // Force-expanded cases
  if (settingsStore.expandAll || filtersStore.isActive) return true;

  // Auto-expand cases
  if (shouldExpandMonth(props.month)) return true;

  // Fallback to manual state
  return manualExpanded.value;
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
// 新增：按类型分组条目
const groupedEntries = computed(() => {
  const groups: Record<EntryType, string[]> = {} as Record<EntryType, string[]>;

  // 初始化所有类型
  const entryTypes = ['learn', 'play', 'watch', 'read'] as const;
  entryTypes.forEach((type) => {
    groups[type as EntryType] = [];
  });

  // 分组条目名称
  props.month.entries.forEach((entry) => {
    groups[entry.type].push(entry.name);
  });

  return groups;
});

const groupedDisplayText = computed(() => {
  const parts: string[] = [];
  const listSeparator = t('punctuation.space.listSeparator');
  const typeSeparator = t('punctuation.space.typeSeparator');
  const betweenTypeAndName = t('punctuation.space.betweenTypeAndName');

  Object.entries(groupedEntries.value).forEach(([type, names]) => {
    if (names.length > 0) {
      const typeChar = typeMap.value[type as EntryType];
      const displayNames =
        names.length > 3
          ? [
              ...names.slice(0, 3),
              t('monthCard.andMore', { count: names.length }),
            ]
          : names;
      parts.push(
        `${typeChar}${betweenTypeAndName}${displayNames.join(listSeparator)}`,
      );
    }
  });

  return parts.join(typeSeparator);
});
</script>

<template>
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
          >
            <el-dropdown
              placement="bottom"
              trigger="click"
              size="large"
              teleported
            >
              <EntryItem :entry="entry.element" />
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
          cursor: 'pointer',
          padding: '0.75rem 1rem',
        }"
        @click="manualExpanded = !manualExpanded"
        v-else
      >
        <el-text
          line-clamp="1"
          :type="
            isPastMonthFullyCompleted(month)
              ? 'success'
              : isFutureMonthAllNotStarted(month)
                ? 'info'
                : ''
          "
        >
          <span>
            {{
              (isPastMonthFullyCompleted(month)
                ? t('monthCard.completed')
                : isFutureMonthAllNotStarted(month)
                  ? t('monthCard.planned')
                  : '') + t('punctuation.space.betweenWords')
            }}
          </span>

          <span v-show="settingsStore.showNumCollapsed">{{
            String(month.entries.length) +
            t('punctuation.space.betweenWords') +
            t('monthCard.entries')
          }}</span>

          <span v-show="settingsStore.showEntriesCollapsed">
            {{ t('punctuation.colon') + groupedDisplayText }}</span
          >
        </el-text>

        <el-text type="primary" size="small"
          ><el-icon size="18"><ArrowDown /></el-icon
        ></el-text>
      </div>
    </div>
  </ElCard>
</template>

<style scoped>
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
  border-radius: 8px; /* 比主元素稍大 */
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
</style>
