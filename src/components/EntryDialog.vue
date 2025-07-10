<template>
  <el-dialog
    v-model="visible"
    :title="(dialogStore.isEditing ? '编辑' : '添加') + '条目'"
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
      <el-form-item label="类型" required prop="type">
        <el-select v-model="formData.type" placeholder="选择条目类型">
          <el-option label="学" value="learn" />
          <el-option label="玩" value="play" />
          <el-option label="看" value="watch" />
          <el-option label="读" value="read" />
        </el-select>
      </el-form-item>
      <el-form-item label="名称" required prop="name">
        <el-input
          v-model="formData.name"
          placeholder="输入条目名称"
          clearable
        />
      </el-form-item>

      <el-form-item label="月份" required prop="month">
        <el-date-picker
          v-model="formData.month"
          type="month"
          placeholder="选择月份"
          :clearable="false"
          :editable="false"
        >
        </el-date-picker>
      </el-form-item>

      <el-form-item label="进度" required prop="status">
        <el-segmented
          v-model="formData.status"
          :options="statusOptions"
          style="margin-bottom: 1rem"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogStore.close()">取消</el-button>
      <el-button
        type="primary"
        @click="
          formRef
            ?.validate()
            .then(() => handleSubmit(formData))
            .catch(() => {
              ElMessage.error('条目信息不能为空');
            })
        "
        >确认</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useDialogStore } from '@/stores/dialog';
import { useTimelineStore } from '@/stores/timeline';
import type { EntryFormData, EntryType } from '@/types/models';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
const formRef = ref<FormInstance>();
const dialogStore = useDialogStore();
const timelineStore = useTimelineStore();
const { visible, formData } = storeToRefs(dialogStore);
const statusOptions = [
  { label: '未开始', value: 'not_started' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
];

function handleSubmit(formData: EntryFormData) {
  const newMonthYear = {
    month: formData.month.getMonth() + 1,
    year: formData.month.getFullYear(),
  };
  if (dialogStore.isEditing) {
    if (dialogStore.entryToEdit.monthYear !== newMonthYear) {
      timelineStore.moveBetweenMonth(
        dialogStore.entryToEdit.id as string,
        dialogStore.entryToEdit.monthYear as { month: number; year: number },
        newMonthYear
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
