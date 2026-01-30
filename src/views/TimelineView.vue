<template>
  <header class="action-bar">
    <el-button type="primary" text @click="drawerVisible = true"
      ><el-icon size="24"><Operation /></el-icon
    ></el-button>
    <el-text
      >{{ t('timeline.updatedAt') }}{{ t('punctuation.colon') }}
      {{
        timelineStore.lastUpdated
          ? smartFormatDateTime(timelineStore.lastUpdated)
          : t('timeline.noEntries')
      }}</el-text
    >
    <el-button type="primary" text @click="dialogStore.open()">{{
      t('common.add')
    }}</el-button>
  </header>

  <div class="timeline-content">
    <EntryDialog />
    <el-drawer
      v-model="drawerVisible"
      show-close
      size="400px"
      modal
      :title="t('filters.title')"
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
        <el-text
          >{{ t('filters.categories') }}{{ t('punctuation.colon') }}</el-text
        >
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
        <el-text>{{ t('filters.status') }}{{ t('punctuation.colon') }}</el-text>
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

      <el-text>{{ t('filters.notes') }}</el-text>
      <template #footer>
        <el-button type="primary" text @click="resetFilters()">{{
          t('common.reset')
        }}</el-button>
        <el-button type="primary" @click="confirmFilters()">{{
          t('common.save')
        }}</el-button>
      </template>
    </el-drawer>

    <el-timeline>
      <el-timeline-item
        :timestamp="t('timeline.topReached')"
        placement="top"
      ></el-timeline-item>

      <el-timeline-item
        v-for="timelineMonth in timelineStore.allMonths"
        :key="formatYearMonth(timelineMonth)"
        :timestamp="
          formatMonth(formatYearMonth(timelineMonth)) +
          (isCurrentMonth(timelineMonth)
            ? t('punctuation.space.betweenWords') +
              t('punctuation.bracket.round[0]') +
              t('timeline.current') +
              t('punctuation.bracket.round[1]')
            : '')
        "
        :type="isCurrentMonth(timelineMonth) ? 'primary' : undefined"
        placement="top"
      >
        <MonthCard :month="timelineMonth"></MonthCard>
      </el-timeline-item>
      <el-timeline-item
        :timestamp="t('timeline.bottomReached')"
        placement="top"
      ></el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import EntryDialog from '@/components/EntryDialog.vue';
import MonthCard from '@/components/MonthCard.vue';
import { useTimelineStore } from '@/stores/timeline';
import { useDialogStore } from '@/stores/dialog';
import { useFiltersStore } from '@/stores/filters';
import {
  formatMonth,
  smartFormatDateTime,
  isCurrentMonth,
  formatYearMonth,
} from '@/utils/dateFormatter';

const { t } = useI18n();
const drawerVisible = ref(false);
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();
const filtersStore = useFiltersStore();
const typeOptions = [
  { label: t('entry.shortTypes.learn'), value: 'learn' },
  { label: t('entry.shortTypes.play'), value: 'play' },
  { label: t('entry.shortTypes.watch'), value: 'watch' },
  { label: t('entry.shortTypes.read'), value: 'read' },
];
const typeFilters = ref([...filtersStore.activeFilters.type]);

const statusOptions = [
  { label: t('entry.statuses.not_started'), value: 'not_started' },
  { label: t('entry.statuses.in_progress'), value: 'in_progress' },
  { label: t('entry.statuses.completed'), value: 'completed' },
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
