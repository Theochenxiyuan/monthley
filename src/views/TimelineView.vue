<template>
  <header class="action-bar">
    <el-button type="primary" text
      ><el-icon size="24"><Operation /></el-icon
    ></el-button>
    <el-text
      >同步于：{{
        timelineStore.lastSynced
          ? smartFormatDateTime(timelineStore.lastSynced)
          : '无记录'
      }}</el-text
    >
    <el-button type="primary" text @click="dialogStore.open()">添加</el-button>
  </header>

  <div class="timeline-content">
    <EntryDialog />
    <el-timeline>
      <el-timeline-item
        timestamp="已经到顶了"
        placement="top"
      ></el-timeline-item>

      <el-timeline-item
        v-for="timelineMonth in timelineStore.timelineWithCurrentMonth"
        :timestamp="
          formatMonthToChinese(`${timelineMonth.year}-${timelineMonth.month}`) +
          (isCurrentMonth({ ...timelineMonth }) ? '（当前）' : '')
        "
        :type="isCurrentMonth({ ...timelineMonth }) ? 'primary' : undefined"
        placement="top"
      >
        <MonthCard :month="timelineMonth" is-open></MonthCard>
      </el-timeline-item>
      <el-timeline-item
        timestamp="已经到底了"
        placement="top"
      ></el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup lang="ts">
import EntryDialog from '@/components/EntryDialog.vue';
import MonthCard from '@/components/MonthCard.vue';
import { useTimelineStore } from '@/stores/timeline';
import { useDialogStore } from '@/stores/dialog';
import {
  formatMonthToChinese,
  smartFormatDateTime,
  isCurrentMonth,
} from '@/utils/formatDate';
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();
</script>

<style scoped>
.timeline-content {
  padding-left: 5px;
  padding-right: 10px;
  padding-top: 15px;
  padding-bottom: 50px;
}
.blank {
  height: 50px;
}
</style>
