<script setup lang="ts">
import type { TimelineEntry, EntryStatus } from '@/types/models';
import { statusMap, typeMap } from '@/types/models';
import { Reading, School } from '@element-plus/icons-vue';

const props = defineProps<{
  entry: TimelineEntry;
}>();

const getEntryColorFromStatus = (
  status: EntryStatus
): 'success' | 'primary' | 'info' => {
  const statusColors = {
    not_started: 'info',
    in_progress: 'primary',
    completed: 'success',
  } as const;
  return statusColors[status] || 'info';
};
const getStatusText = (entry: TimelineEntry): string => {
  return `${statusMap[entry.status] || ''}${
    typeMap[entry.type as keyof typeof typeMap] || entry.type
  }`;
};
</script>

<template>
  <div :class="['entry-item']">
    <el-tag
      size="large"
      :type="getEntryColorFromStatus(entry.status)"
      disable-transitions
    >
      <div style="display: flex; align-items: center" class="not-selectable">
        <span style="margin-right: 3px">
          <el-icon size="16">
            <SwitchFilled v-if="entry.type === 'play'" />
            <School v-else-if="entry.type === 'learn'" />
            <Film v-else-if="entry.type === 'watch'" />
            <Reading v-else-if="entry.type === 'read'" />
            <StarFilled v-else /> </el-icon
        ></span>
        <el-text tag="b" :type="getEntryColorFromStatus(entry.status)">
          {{ getStatusText(entry) }}
        </el-text>

        <el-divider direction="vertical"></el-divider>

        <el-text
          size="default"
          :type="getEntryColorFromStatus(entry.status)"
          truncated
          style="max-width: 200px"
        >
          {{ entry.name }}</el-text
        >
      </div>
    </el-tag>

    <div class="complete-cover" v-show="entry.status === 'completed'"></div>
    <el-text
      class="complete-sign"
      size="large"
      type="success"
      v-show="entry.status === 'completed'"
    >
      <el-icon size="24"><Select /></el-icon
    ></el-text>
  </div>
</template>

<style>
.entry-item {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.complete-cover {
  opacity: 0.6;
  background-color: var(--el-bg-color);
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  text-align: center;
}
.complete-sign {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  transition: 1s;
}
.not-selectable {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
