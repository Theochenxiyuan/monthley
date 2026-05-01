<template>
  <el-dialog
    v-model="visible"
    :title="
      (dialogStore.isEditing ? t('common.edit') : t('common.add')) +
      t('punctuation.space.betweenWords') +
      t('common.entry')
    "
    style="width: 480px; max-width: 92vw"
    :close-on-click-modal="true"
    align-center
  >
    <el-form
      @submit="handleSubmit"
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :show-message="false"
      hide-required-asterisk
    >
      <div class="type-name-row">
        <el-form-item required prop="type" class="type-form-item">
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
        <el-form-item required prop="name" class="name-form-item">
          <el-input
            v-model="formData.name"
            :placeholder="t('entry.namePlaceholder')"
            clearable
          />
        </el-form-item>
      </div>

      <el-form-item required prop="month">
        <div class="month-picker-row">
          <el-button
            class="month-step-button"
            :aria-label="t('entry.previousMonth')"
            :title="t('entry.previousMonth')"
            @click="shiftMonth(-1)"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-date-picker
            v-model="formData.month"
            type="month"
            :format="monthPickerFormat"
            :placeholder="t('entry.date')"
            :clearable="false"
            :editable="false"
          />
          <el-button
            class="month-step-button"
            :aria-label="t('entry.nextMonth')"
            :title="t('entry.nextMonth')"
            @click="shiftMonth(1)"
          >
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
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
import { ref, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useDialogStore } from '@/stores/dialog';
import { useTimelineStore } from '@/stores/timeline';
import type { EntryFormData, EntryType } from '@/types/models';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';

const { t, locale } = useI18n();

const formRef = ref<FormInstance>();
const dialogStore = useDialogStore();
const timelineStore = useTimelineStore();
const { visible, formData } = storeToRefs(dialogStore);

const formRules = reactive({
  type: [{ required: true, message: '', trigger: 'change' }],
  name: [{ required: true, message: '', trigger: 'blur' }],
  month: [{ required: true, message: '', trigger: 'change' }],
  status: [{ required: true, message: '', trigger: 'change' }],
});

const statusOptions = computed(() => [
  { label: t('entry.statuses.not_started'), value: 'not_started' },
  { label: t('entry.statuses.in_progress'), value: 'in_progress' },
  { label: t('entry.statuses.completed'), value: 'completed' },
]);

const monthPickerFormat = computed(() => locale.value === 'zh-CN' ? 'YYYY年M月' : 'MMMM YYYY');

function shiftMonth(monthOffset: number) {
  const current = formData.value.month instanceof Date ? formData.value.month : new Date();
  formData.value.month = new Date(current.getFullYear(), current.getMonth() + monthOffset, 1);
}

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
.month-picker-row {
  display: flex;
  width: 100%;
  gap: 8px;
  align-items: center;
}
.month-picker-row :deep(.el-date-editor) {
  flex: 1;
}
.month-step-button {
  flex: 0 0 auto;
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
  background-color: var(--el-color-info) !important;
  border-color: var(--el-color-info) !important;
  color: var(--el-color-white) !important;
}
.status-in_progress :deep(.el-segmented__item-selected) {
  background-color: var(--el-color-primary) !important;
  border-color: var(--el-color-primary) !important;
  color: var(--el-color-white) !important;
}
.status-completed :deep(.el-segmented__item-selected) {
  background-color: var(--el-color-success) !important;
  border-color: var(--el-color-success) !important;
  color: var(--el-color-white) !important;
}
</style>
