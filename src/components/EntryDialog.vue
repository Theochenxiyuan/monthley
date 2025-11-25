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
          <el-option label="学（知识、技能）" value="learn" />
          <el-option label="玩（游戏）" value="play" />
          <el-option label="看（影视）" value="watch" />
          <el-option label="读（书本）" value="read" />
        </el-select>
      </el-form-item>
      <el-form-item label="名称" required prop="name">
        <el-input
          v-model="formData.name"
          placeholder="输入条目名称"
          clearable
        />
      </el-form-item>

      <el-form-item label="快速格式">
        <el-button
          text
          type="primary"
          @click="addFormat"
          :disabled="!formData.name || !formData.type"
        >
          {{ formatButtonText }}
        </el-button>
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
import { ref, computed } from 'vue';
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

// 符号映射配置
const formatMap = {
  learn: { symbol: '【】', name: '方括号' },
  play: { symbol: '《》', name: '书名号' },
  watch: { symbol: '《》', name: '书名号' },
  read: { symbol: '《》', name: '书名号' },
} as const;

// 计算按钮显示文本
const formatButtonText = computed(() => {
  if (!formData.value.type) return '一键添加格式';
  const format = formatMap[formData.value.type as EntryType];
  const name = formData.value.name.trim();

  // 检查是否已经包含对应的符号
  const [start, end] = [format.symbol[0], format.symbol[1]];
  const hasFormat = name.startsWith(start) && name.endsWith(end);

  return hasFormat ? `移除${format.name}` : `添加${format.name}`;
});

// 智能添加/移除格式符号
function addFormat() {
  if (!formData.value.name || !formData.value.type) return;

  const name = formData.value.name.trim();
  const format = formatMap[formData.value.type as EntryType];
  const [start, end] = [format.symbol[0], format.symbol[1]];

  // 检查是否已经包含对应的符号
  if (name.startsWith(start) && name.endsWith(end)) {
    // 如果已经有符号，移除它们
    formData.value.name = name.slice(1, -1);
  } else if (name.startsWith(start) || name.endsWith(end)) {
    // 如果只有一边有符号，清理后重新添加
    const cleanedName = name.replace(new RegExp(`^${start}|${end}$`, 'g'), '');
    formData.value.name = `${start}${cleanedName}${end}`;
  } else {
    // 如果没有符号，直接添加
    formData.value.name = `${start}${name}${end}`;
  }
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
