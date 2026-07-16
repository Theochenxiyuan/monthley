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
    @close="dialogStore.close()"
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

      <el-form-item>
        <button
          type="button"
          class="unscheduled-toggle"
          :class="{ 'unscheduled-toggle--active': formData.isUnscheduled }"
          :aria-pressed="formData.isUnscheduled"
          @click="formData.isUnscheduled = !formData.isUnscheduled"
        >
          <span class="unscheduled-toggle-text">
            <span class="unscheduled-toggle-title">{{ t('entry.unscheduled') }}</span>
            <span class="unscheduled-toggle-hint">{{ t('entry.unscheduledHint') }}</span>
          </span>
          <span class="unscheduled-toggle-check">
            <span class="unscheduled-toggle-dot"></span>
          </span>
        </button>
      </el-form-item>

      <el-form-item required prop="month">
        <div class="month-picker-row" :class="{ 'month-picker-row--disabled': formData.isUnscheduled }">
          <el-button
            class="month-step-button"
            text
            :disabled="formData.isUnscheduled"
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
            :disabled="formData.isUnscheduled"
          />
          <el-button
            class="month-step-button"
            text
            :disabled="formData.isUnscheduled"
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

const { t } = useI18n();

const formRef = ref<FormInstance>();
const dialogStore = useDialogStore();
const timelineStore = useTimelineStore();
const { visible, formData } = storeToRefs(dialogStore);

const formRules = reactive({
  type: [{ required: true, message: '', trigger: 'change' }],
  name: [{ required: true, message: '', trigger: 'blur' }],
  status: [{ required: true, message: '', trigger: 'change' }],
});

const statusOptions = computed(() => [
  { label: t('entry.statuses.not_started'), value: 'not_started' },
  { label: t('entry.statuses.in_progress'), value: 'in_progress' },
  { label: t('entry.statuses.completed'), value: 'completed' },
]);

const monthPickerFormat = computed(() => t('date.formats.monthPicker'));

function shiftMonth(monthOffset: number) {
  const current = formData.value.month instanceof Date ? formData.value.month : new Date();
  formData.value.month = new Date(current.getFullYear(), current.getMonth() + monthOffset, 1);
}

function handleSubmit(formData: EntryFormData) {
  if (!formData.isUnscheduled && !(formData.month instanceof Date)) {
    ElMessage.error(t('entry.validationError'));
    return;
  }

  const newMonthYear = formData.month instanceof Date
    ? {
        month: formData.month.getMonth() + 1,
        year: formData.month.getFullYear(),
      }
    : null;

  if (dialogStore.isEditing) {
    const entryId = dialogStore.entryToEdit.id as string;
    const newEntryData = {
      id: entryId,
      status: formData.status,
      type: formData.type as EntryType,
      name: formData.name,
    };

    if (formData.isUnscheduled) {
      if (!dialogStore.entryToEdit.isUnscheduled && dialogStore.entryToEdit.monthYear) {
        timelineStore.moveMonthEntryToUnscheduled(entryId, dialogStore.entryToEdit.monthYear);
      }
      timelineStore.updateUnscheduledEntry(newEntryData);
    } else if (newMonthYear) {
      if (dialogStore.entryToEdit.isUnscheduled) {
        timelineStore.moveUnscheduledToMonth(entryId, newMonthYear);
      } else {
        const isSameMonthYear =
          dialogStore.entryToEdit.monthYear?.month === newMonthYear.month &&
          dialogStore.entryToEdit.monthYear?.year === newMonthYear.year;
        if (!isSameMonthYear && dialogStore.entryToEdit.monthYear) {
          timelineStore.moveBetweenMonth(
            entryId,
            dialogStore.entryToEdit.monthYear,
            newMonthYear,
          );
        }
      }
      timelineStore.updateEntry(newMonthYear, newEntryData);
    }
  } else if (formData.isUnscheduled) {
    timelineStore.addUnscheduledEntry({
      status: formData.status,
      type: formData.type as EntryType,
      name: formData.name,
    });
  } else {
    timelineStore.addEntry(newMonthYear as { month: number; year: number }, {
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
  transition: opacity 0.2s ease, filter 0.2s ease;
}
.month-picker-row--disabled {
  opacity: 0.54;
  filter: saturate(0.7);
}
.month-picker-row :deep(.el-date-editor) {
  flex: 1;
}
.month-step-button {
  flex: 0 0 auto;
  width: 40px;
  height: 32px;
  border: 0 !important;
  background: transparent !important;
  color: var(--el-text-color-secondary);
  box-shadow: none !important;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
.month-step-button:not(.is-disabled):hover {
  background: var(--el-fill-color-light) !important;
  color: var(--el-color-primary);
  transform: translateY(-1px);
}
.month-step-button:not(.is-disabled):active {
  transform: translateY(0);
}
.month-step-button.is-disabled {
  background: transparent !important;
  border-color: transparent !important;
}
:deep(.el-date-editor) {
  width: 100%;
}
.unscheduled-toggle {
  width: 100%;
  min-height: 46px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px 10px 8px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  cursor: pointer;
  text-align: left;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}
.unscheduled-toggle:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-fill-color-extra-light);
}
.unscheduled-toggle--active {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}
.unscheduled-toggle-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.unscheduled-toggle-title {
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.25;
}
.unscheduled-toggle-hint {
  color: var(--el-text-color-secondary);
  font-size: 0.72rem;
  line-height: 1.3;
}
.unscheduled-toggle-check {
  width: 30px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 999px;
  background: var(--el-border-color-lighter);
  transition: background-color 0.2s ease;
}
.unscheduled-toggle-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--el-bg-color);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  transition: transform 0.2s ease;
}
.unscheduled-toggle--active .unscheduled-toggle-check {
  background: var(--el-color-primary);
}
.unscheduled-toggle--active .unscheduled-toggle-dot {
  transform: translateX(12px);
}
.status-segmented {
  width: 100%;
  --el-border-radius-base: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-fill-color-light);
  padding: 3px;
}
.status-segmented :deep(.el-segmented__item) {
  padding: 6px 0;
  border-radius: 9px;
}
.status-segmented :deep(.el-segmented__item:not(.is-selected)) {
  color: var(--el-text-color-secondary);
}
.status-segmented :deep(.el-segmented__item-selected) {
  border-radius: 9px;
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
