<script setup lang="ts">
import type { TimelineMonth } from '@/types/models';
import EntryItem from './EntryItem.vue';
import { useDialogStore } from '@/stores/dialog';
import { useTimelineStore } from '@/stores/timeline';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatYearMonth } from '@/utils/formatDate';
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();
const props = defineProps<{
  month: TimelineMonth;
  isOpen: boolean;
}>();

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
</script>

<template>
  <ElCard
    body-style="padding: 15px;display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center"
  >
    <el-dropdown
      placement="bottom"
      trigger="click"
      v-for="entry in month.entries"
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

    <ElButton
      type="primary"
      text
      size="small"
      @click="dialogStore.open({ month: new Date(formatYearMonth(month)) })"
    >
      <el-icon size="18"><Plus /></el-icon>
    </ElButton>
  </ElCard>
</template>

<style></style>
