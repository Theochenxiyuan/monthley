<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatMonth } from '@/utils/dateFormatter';
import type { AutoSchedulePlanItem } from '@/types/models';
import type { TimelineEntry } from '@/types/models';

const props = defineProps<{
  modelValue: boolean;
  plan: (AutoSchedulePlanItem & { entryName: string })[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
}>();

const { t } = useI18n();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

function formatTargetMonth(item: AutoSchedulePlanItem & { entryName: string }) {
  return formatMonth({ year: item.targetYear, month: item.targetMonth });
}

function onConfirm() {
  emit('confirm');
  visible.value = false;
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="t('autoSchedule.title')"
    width="360px"
    align-center
  >
    <div class="schedule-plan">
      <div v-for="item in plan" :key="item.entryId" class="plan-item">
        <span class="plan-entry-name">{{ item.entryName }}</span>
        <span class="plan-arrow">→</span>
        <span class="plan-target-month">{{ formatTargetMonth(item) }}</span>
      </div>
    </div>
    <template #footer>
      <el-button @click="visible = false">{{ t('autoSchedule.cancel') }}</el-button>
      <el-button type="primary" @click="onConfirm">{{ t('autoSchedule.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.schedule-plan {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
}

.plan-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.plan-entry-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}

.plan-arrow {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  flex-shrink: 0;
}

.plan-target-month {
  color: var(--el-color-primary);
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>