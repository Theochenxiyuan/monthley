<script setup lang="ts">
import type { TimelineMonth } from '@/types/models';
import { typeMap } from '@/types/models';
import EntryItem from './EntryItem.vue';
import { useDialogStore } from '@/stores/dialog';
import { useTimelineStore } from '@/stores/timeline';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatYearMonth } from '@/utils/formatDate';
import { computed, ref } from 'vue';
import { isCurrentMonth } from '@/utils/formatDate';
import { useSettingsStore } from '@/stores/settings';
import { useFiltersStore } from '@/stores/filters';
const settingsStore = useSettingsStore();
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();
const filtersStore = useFiltersStore();
const props = defineProps<{
  month: TimelineMonth;
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
    isCurrentMonth(formatYearMonth(props.month)) || // 当前月
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

const manualExpanded = ref(false); // For manual toggle state

const isExpanded = computed(() => {
  // Force-expanded cases
  if (settingsStore.expandAll || filtersStore.isActive) return true;

  // Auto-expand cases
  if (shouldExpandMonth(props.month)) return true;

  // Fallback to manual state
  return manualExpanded.value;
});

const handleDelete = (entryId: string): void => {
  ElMessageBox.confirm('请确认是否要删除本条目，此操作无法撤回', '删除条目', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'info',
  })
    .then(() => {
      timelineStore.deleteEntry(
        { year: props.month.year, month: props.month.month },
        entryId
      );
      ElMessage({
        type: 'success',
        message: '删除成功',
      });
    })
    .catch(() => {});
};

const filteredEntries = computed(() => {
  if (!filtersStore.isActive) return props.month.entries;

  const { isTypeFilterActive, activeFilters, isStatusFilterActive } =
    filtersStore;

  return props.month.entries.filter(
    (entry) =>
      (!isTypeFilterActive || activeFilters.type.includes(entry.type)) &&
      (!isStatusFilterActive || activeFilters.status.includes(entry.status))
  );
});

const hiddenCount = computed(() => {
  return props.month.entries.length - filteredEntries.value.length;
});
</script>

<template>
  <ElCard
    :body-style="{
      padding: '15px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      alignItems: 'center',
    }"
    v-if="isExpanded"
  >
    <el-dropdown
      placement="bottom"
      trigger="click"
      v-for="entry in filteredEntries"
      :key="entry.id"
      size="large"
      teleported
    >
      <EntryItem :entry="entry" />
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-if="entry.status !== 'completed'"
            @click="
              timelineStore.toNextStatus(
                { year: month.year, month: month.month },
                entry.id
              )
            "
            ><el-text
              size="large"
              :type="entry.status === 'in_progress' ? 'success' : 'primary'"
              >{{ entry.status === 'in_progress' ? '完成' : '开始' }}</el-text
            ></el-dropdown-item
          >
          <el-dropdown-item
            @click="
              dialogStore.open(
                {
                  month: new Date(formatYearMonth(month)),
                  ...entry,
                },
                entry.id
              )
            "
            ><el-text size="large" type="warning"
              >编辑</el-text
            ></el-dropdown-item
          >
          <el-dropdown-item @click="handleDelete(entry.id)"
            ><el-text size="large" type="danger"
              >删除</el-text
            ></el-dropdown-item
          >
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-text v-show="filtersStore.isActive" type="warning" size="small"
      >({{ hiddenCount }}个已隐藏)</el-text
    >
    <ElButton
      type="primary"
      text
      size="small"
      @click="dialogStore.open({ month: new Date(formatYearMonth(month)) })"
    >
      <el-icon size="18"><Plus /></el-icon>
    </ElButton>
  </ElCard>

  <ElCard
    :body-style="{
      padding: '0.8rem 1rem',
      display: 'flex',
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
      cursor: 'pointer',
    }"
    @click="manualExpanded = true"
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
      <span v-show="settingsStore.showNumCollapsed">{{
        String(month.entries.length) + '个'
      }}</span>
      <span>
        {{
          isPastMonthFullyCompleted(month)
            ? '已完成'
            : isFutureMonthAllNotStarted(month)
            ? '已计划'
            : ''
        }}</span
      >

      <span v-show="settingsStore.showEntriesCollapsed">
        {{
          ': ' + month.entries.map((e) => typeMap[e.type] + e.name).join('，')
        }}</span
      >
    </el-text>

    <el-text type="primary" size="small"
      ><el-icon size="18"><ArrowDown /></el-icon
    ></el-text>
  </ElCard>
</template>
