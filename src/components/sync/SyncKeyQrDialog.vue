<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { DocumentCopy } from '@element-plus/icons-vue';
import QrcodeVue from 'qrcode.vue';
import { encodeSyncKeyQrValue } from '@/utils/syncKey';

const props = defineProps<{
  modelValue: boolean;
  syncKey: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();

const qrValue = computed(() => encodeSyncKeyQrValue(props.syncKey));

async function copyKey() {
  try {
    await navigator.clipboard.writeText(props.syncKey);
    ElMessage.success(t('sync.copySuccess'));
  } catch {
    ElMessage.error(t('sync.copyFailed'));
  }
}
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    :title="t('sync.qrTitle')"
    width="min(92%, 380px)"
    align-center
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="sync-key-qr">
      <el-alert
        :title="t('sync.qrSecurityWarning')"
        type="warning"
        :closable="false"
        show-icon
      />

      <div class="qr-card">
        <QrcodeVue :value="qrValue" :size="220" level="H" render-as="svg" />
      </div>

      <el-input :model-value="props.syncKey" readonly>
        <template #append>
          <el-button @click="copyKey">
            <el-icon><DocumentCopy /></el-icon>
          </el-button>
        </template>
      </el-input>
    </div>
  </el-dialog>
</template>

<style scoped>
.sync-key-qr {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.qr-card {
  display: flex;
  justify-content: center;
  padding: 1rem;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background-color: #ffffff;
}
</style>
