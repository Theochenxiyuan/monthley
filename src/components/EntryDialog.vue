<template>
  <el-dialog
    v-model="visible"
    :title="
      (dialogStore.isEditing ? t('common.edit') : t('common.add')) +
      t('punctuation.space.betweenWords') +
      t('common.entry')
    "
    style="width: 600px; max-width: 90vw"
    :close-on-click-modal="true"
  >
    <el-form
      @submit="handleSubmit"
      ref="formRef"
      :model="formData"
      :show-message="false"
      hide-required-asterisk
    >
      <div class="type-name-row">
        <el-form-item prop="type" class="type-form-item">
          <el-select
            v-model="formData.type"
            :placeholder="t('entry.categoryPlaceholder')"
          >
            <el-option :label="t('entry.types.learn')" value="learn" />
            <el-option :label="t('entry.types.play')" value="play" />
            <el-option :label="t('entry.types.watch')" value="watch" />
            <el-option :label="t('entry.types.read')" value="read" />
          </el-select>
        </el-form-item>
        <el-form-item prop="name" class="name-form-item">
          <el-input
            v-model="formData.name"
            :placeholder="t('entry.namePlaceholder')"
            clearable
          />
        </el-form-item>
      </div>

      <el-form-item required prop="month">
        <el-date-picker
          v-model="formData.month"
          type="month"
          :placeholder="t('entry.date')"
          :clearable="false"
          :editable="false"
        />
      </el-form-item>

      <el-form-item required prop="status">
        <el-segmented
          v-model="formData.status"
          :options="statusOptions"
          :class="['status-segmented', `status-${formData.status}`]"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.close()">{{
        t('common.cancel')
      }}</el-button>
      <el-button
        type="primary"
        @click="
          formRef
            ?.validate()
            .then(() => handleSubmit(formData))
            .catch(() => {
              ElMessage.error(t('entry.validationError'));
            })
        "
        >{{ t('common.save') }}</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useDialogStore } from '@/stores/dialog';
import { useTimelineStore } from '@/stores/timeline';
import type { EntryFormData, EntryType } from '@/types/models';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';

const { t } = useI18n();

const formRef = ref<FormInstance>();
const dialogStore = useDialogStore();
const timelineStore = useTimelineStore();
const { visible, formData } = storeToRefs(dialogStore);

const statusOptions = [
  { label: t('entry.statuses.not_started'), value: 'not_started' },
  { label: t('entry.statuses.in_progress'), value: 'in_progress' },
  { label: t('entry.statuses.completed'), value: 'completed' },
];

function handleSubmit(formData: EntryFormData) {
  const newMonthYear = {
    month: formData.month.getMonth() + 1,
    year: formData.month.getFullYear(),
  };
  if (dialogStore.isEditing) {
    const isSameMonthYear =
      dialogStore.entryToEdit.monthYear?.month === newMonthYear.month &&
      dialogStore.entryToEdit.monthYear?.year === newMonthYear.year;
    if (!isSameMonthYear) {
      timelineStore.moveBetweenMonth(
        dialogStore.entryToEdit.id as string,
        dialogStore.entryToEdit.monthYear as { month: number; year: number },
        newMonthYear,
      );
    }
    timelineStore.updateEntry(newMonthYear, {
      id: dialogStore.entryToEdit.id as string,
      status: formData.status,
      type: formData.type as EntryType,
      name: formData.name,
    });
  } else {
    timelineStore.addEntry(newMonthYear, {
      status: formData.status,
      type: formData.type as EntryType,
      name: formData.name,
    });
  }

  dialogStore.close();
}
</script>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 22px;
}
.type-name-row {
  display: flex;
  gap: 0.5rem;
}
.type-form-item {
  flex: 0 0 auto;
  width: 120px;
}
.name-form-item {
  flex: 1;
  min-width: 0;
}
.type-name-row :deep(.el-form-item__label) {
  display: none;
}
.type-name-row :deep(.el-select),
.name-form-item :deep(.el-input) {
  width: 100%;
}
:deep(.el-date-editor) {
  width: 100%;
}
.status-segmented {
  width: 100%;
}
.status-segmented :deep(.el-segmented__item) {
  padding: 6px 0;
}
.status-segmented :deep(.el-segmented__item-selected) {
  transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}
.status-not_started :deep(.el-segmented__item-selected) {
  background-color: var(--el-color-info-light-7) !important;
  border-color: var(--el-color-info-light-3) !important;
  color: var(--el-color-info-dark-2) !important;
}
.status-in_progress :deep(.el-segmented__item-selected) {
  background-color: var(--el-color-primary-light-7) !important;
  border-color: var(--el-color-primary-light-3) !important;
  color: var(--el-color-primary-dark-2) !important;
}
.status-completed :deep(.el-segmented__item-selected) {
  background-color: var(--el-color-success-light-7) !important;
  border-color: var(--el-color-success-light-3) !important;
  color: var(--el-color-success-dark-2) !important;
}
</style>