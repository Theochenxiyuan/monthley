<template>
  <header class="action-bar">
    <el-button type="primary" text @click="drawerVisible = true"
      ><el-icon size="24"><Operation /></el-icon
    ></el-button>
    <el-text
      >更新于：{{
        timelineStore.lastUpdated
          ? smartFormatDateTime(timelineStore.lastUpdated)
          : '无记录'
      }}</el-text
    >
    <el-button type="primary" text @click="dialogStore.open()">添加</el-button>
  </header>

  <div class="timeline-content">
    <EntryDialog />
    <el-drawer
      v-model="drawerVisible"
      show-close
      size="320px"
      modal
      title="筛选显示条目"
      direction="ltr"
      @close="
        typeFilters = filtersStore.activeFilters.type;
        statusFilters = filtersStore.activeFilters.status;
      "
      @open="
        typeFilters = filtersStore.activeFilters.type;
        statusFilters = filtersStore.activeFilters.status;
      "
    >
      <div class="filter-item">
        <el-text>按条目类型:</el-text>
        <el-checkbox-group v-model="typeFilters" size="large">
          <el-checkbox-button
            v-for="option in typeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </el-checkbox-button>
        </el-checkbox-group>
      </div>
      <div class="filter-item">
        <el-text>按条目进度:</el-text>
        <el-checkbox-group v-model="statusFilters" size="large">
          <el-checkbox-button
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </el-checkbox-button>
        </el-checkbox-group>
      </div>

      <el-text>注意：使用筛选时月份会展开显示</el-text>
      <template #footer>
        <el-button type="primary" text @click="resetFilters()">重置</el-button>
        <el-button type="primary" @click="confirmFilters()">确认</el-button>
      </template>
    </el-drawer>

    <el-timeline>
      <el-timeline-item
        timestamp="已经到顶了"
        placement="top"
      ></el-timeline-item>

      <el-timeline-item
        v-for="timelineMonth in timelineStore.timelineWithCurrentMonth"
        :key="formatYearMonth(timelineMonth)"
        :timestamp="
          formatMonthToChinese(formatYearMonth(timelineMonth)) +
          (isCurrentMonth(timelineMonth) ? '（当前）' : '')
        "
        :type="isCurrentMonth(timelineMonth) ? 'primary' : undefined"
        placement="top"
      >
        <MonthCard :month="timelineMonth"></MonthCard>
      </el-timeline-item>
      <el-timeline-item
        timestamp="已经到底了"
        placement="top"
      ></el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EntryDialog from '@/components/EntryDialog.vue';
import MonthCard from '@/components/MonthCard.vue';
import { useTimelineStore } from '@/stores/timeline';
import { useDialogStore } from '@/stores/dialog';
import { useFiltersStore } from '@/stores/filters';
import {
  formatMonthToChinese,
  smartFormatDateTime,
  isCurrentMonth,
  formatYearMonth,
} from '@/utils/formatDate';

const drawerVisible = ref(false);
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();
const filtersStore = useFiltersStore();
const typeOptions = [
  { label: '学', value: 'learn' },
  { label: '玩', value: 'play' },
  { label: '看', value: 'watch' },
  { label: '读', value: 'read' },
];
const typeFilters = ref([...filtersStore.activeFilters.type]);

const statusOptions = [
  { label: '未开始', value: 'not_started' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
];

const statusFilters = ref([...filtersStore.activeFilters.status]);

function confirmFilters(): void {
  filtersStore.activeFilters.type = typeFilters.value;
  filtersStore.activeFilters.status = statusFilters.value;
  drawerVisible.value = false;
}
function resetFilters(): void {
  typeFilters.value = [];
  statusFilters.value = [];
}
</script>

<style scoped>
.timeline-content {
  padding-left: 6px;
  padding-right: 10px;
  padding-top: 15px;
  padding-bottom: 50px;
}
.blank {
  height: 50px;
}
.filter-item {
  margin: 10px 0;
  padding: 5px;
}
.filter-item * {
  margin: 5px 0;
}
</style>
