<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps<{
  modelValue: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const userInstruction = computed({
  get: () => settingsStore.autoSchedulePrompt,
  set: (val) => { settingsStore.autoSchedulePrompt = val; },
});

function handleConfirm() {
  emit('confirm');
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="t('autoSchedule.preConfirmTitle')"
    width="380px"
    align-center
  >
    <div class="auto-schedule-prompt">
      <p class="prompt-message">{{ t('autoSchedule.preConfirmMessage') }}</p>

      <div class="prompt-section">
        <div class="prompt-section-title">{{ t('autoSchedule.sendTitle') }}</div>
        <div class="prompt-section-body">{{ t('autoSchedule.sendDescription') }}</div>
      </div>

      <div class="prompt-section">
        <div class="prompt-section-title">{{ t('autoSchedule.notSendTitle') }}</div>
        <div class="prompt-section-body">{{ t('autoSchedule.notSendDescription') }}</div>
      </div>

      <div class="prompt-field">
        <div class="prompt-field-label">{{ t('autoSchedule.userInstructionLabel') }}</div>
        <el-input
          v-model="userInstruction"
          type="textarea"
          :rows="4"
          maxlength="300"
          show-word-limit
          :placeholder="t('autoSchedule.userInstructionPlaceholder')"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ t('autoSchedule.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="handleConfirm">
        {{ t('autoSchedule.start') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.auto-schedule-prompt {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.prompt-message {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.prompt-section {
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-extra-light);
}

.prompt-section-title,
.prompt-field-label {
  color: var(--el-text-color-primary);
  font-size: 0.85rem;
  font-weight: 700;
}

.prompt-section-body {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  line-height: 1.5;
}

.prompt-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
