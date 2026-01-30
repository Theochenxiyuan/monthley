<template>
  <el-dialog
    v-model="visible"
    :title="
      (dialogStore.isEditing ? t('common.edit') : t('common.add')) +
      t('entry.title')
    "
    style="width: 600px; max-width: 90vw"
    :close-on-click-modal="false"
  >
    <el-form
      @submit="handleSubmit"
      ref="formRef"
      :model="formData"
      :show-message="false"
      hide-required-asterisk
    >
      <el-form-item :label="t('entry.category')" required prop="type">
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
      <el-form-item :label="t('entry.name')" required prop="name">
        <el-input
          v-model="formData.name"
          :placeholder="t('entry.namePlaceholder')"
          clearable
        />
      </el-form-item>

      <el-form-item :label="t('entry.date')" required prop="month">
        <el-date-picker
          v-model="formData.month"
          type="month"
          :placeholder="t('entry.date')"
          :clearable="false"
          :editable="false"
        >
        </el-date-picker>
      </el-form-item>

      <el-form-item :label="t('entry.status')" required prop="status">
        <el-segmented
          v-model="formData.status"
          :options="statusOptions"
          style="margin-bottom: 1rem"
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
              ElMessage.error(t('entry.namePlaceholder'));
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

const statusOptions = computed(() => [
  { label: t('entry.statuses.not_started'), value: 'not_started' },
  { label: t('entry.statuses.in_progress'), value: 'in_progress' },
  { label: t('entry.statuses.completed'), value: 'completed' },
]);

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
