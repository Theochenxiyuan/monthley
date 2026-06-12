<script setup lang="ts">
import YearSummaryPanel from './YearSummaryPanel.vue';

defineProps<{
  modelValue: boolean;
  initialYear: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    width="min(94%, 420px)"
    class="summary-dialog"
    top="4vh"
    :close-on-click-modal="true"
    destroy-on-close
  >
    <button
      type="button"
      class="summary-dialog-close"
      :aria-label="$t('common.close')"
      @click="emit('update:modelValue', false)"
    >
      <el-icon size="18"><Close /></el-icon>
    </button>
    <YearSummaryPanel :initial-year="initialYear" mode="dialog" />
  </el-dialog>
</template>

<style scoped>
:global(.summary-dialog.el-dialog) {
  max-height: calc(100vh - 8vh);
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:global(.summary-dialog.el-dialog .el-dialog__header) {
  display: none;
}

:global(.summary-dialog.el-dialog .el-dialog__body) {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.summary-dialog-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.summary-dialog-close:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}
</style>
