<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DocumentCopy } from '@element-plus/icons-vue';
import QrcodeVue from 'qrcode.vue';
import { useSettingsStore } from '@/stores/settings';
import { useSync } from '@/composables/useSync';
import SyncKeyScannerDialog from '@/components/sync/SyncKeyScannerDialog.vue';
import { encodeSyncKeyQrValue, isValidSyncKey } from '@/utils/syncKey';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();
const sync = useSync();

const SYNC_ONBOARDING_SKIPPED_KEY = 'syncOnboardingSkipped';

const inputKey = ref('');
const mode = ref<'choice' | 'existing' | 'created'>('choice');
const isWorking = ref(false);
const isScannerVisible = ref(false);

const isValidKey = computed(() => isValidSyncKey(inputKey.value));
const generatedQrValue = computed(() => (
  settingsStore.syncKey ? encodeSyncKeyQrValue(settingsStore.syncKey) : ''
));

function closeDialog() {
  emit('update:modelValue', false);
}

async function createNewKey() {
  if (isWorking.value) return;
  try {
    await ElMessageBox.confirm(
      t('sync.confirmGenerateKey'),
      t('sync.generateKey'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  isWorking.value = true;
  settingsStore.syncKey = sync.generateSyncKey();
  try {
    await sync.push();
    mode.value = 'created';
    ElMessage.success(t('sync.syncSuccess'));
  } catch (error) {
    ElMessage.error(sync.getSyncErrorMessage(error));
  } finally {
    isWorking.value = false;
  }
}

async function useExistingKey() {
  if (!isValidKey.value || isWorking.value) return;
  isWorking.value = true;
  settingsStore.syncKey = inputKey.value;
  try {
    await sync.pull();
    ElMessage.success(t('sync.syncSuccess'));
    closeDialog();
  } catch (error) {
    settingsStore.syncKey = null;
    ElMessage.error(sync.getSyncErrorMessage(error));
  } finally {
    isWorking.value = false;
  }
}

function skipSync() {
  localStorage.setItem(SYNC_ONBOARDING_SKIPPED_KEY, 'true');
  closeDialog();
}

async function copyKey() {
  if (!settingsStore.syncKey) return;
  try {
    await navigator.clipboard.writeText(settingsStore.syncKey);
    ElMessage.success(t('sync.copySuccess'));
  } catch {
    ElMessage.error(t('sync.copyFailed'));
  }
}

async function useScannedKey(syncKey: string) {
  inputKey.value = syncKey;
  await useExistingKey();
}
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    :title="t('syncOnboarding.title')"
    width="min(92%, 420px)"
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="sync-onboarding">
      <p class="sync-onboarding-description">
        {{ t('syncOnboarding.description') }}
      </p>

      <template v-if="mode === 'choice'">
        <el-button type="primary" class="sync-option" :loading="isWorking" @click="createNewKey">
          {{ t('syncOnboarding.createNewKey') }}
        </el-button>
        <el-button plain class="sync-option" @click="mode = 'existing'">
          {{ t('syncOnboarding.useExistingKey') }}
        </el-button>
        <el-button link class="skip-btn" @click="skipSync">
          {{ t('syncOnboarding.skip') }}
        </el-button>
      </template>

      <template v-else-if="mode === 'existing'">
        <p class="sync-onboarding-hint">
          {{ t('syncOnboarding.existingDescription') }}
        </p>
        <el-input
          v-model="inputKey"
          :placeholder="t('sync.enterKeyPlaceholder')"
          clearable
          maxlength="32"
        />
        <div class="sync-onboarding-actions">
          <el-button text @click="mode = 'choice'">
            {{ t('common.cancel') }}
          </el-button>
          <el-button plain @click="isScannerVisible = true">
            {{ t('sync.scanQrCode') }}
          </el-button>
          <el-button type="primary" :disabled="!isValidKey" :loading="isWorking" @click="useExistingKey">
            {{ t('common.confirm') }}
          </el-button>
        </div>
      </template>

      <template v-else>
        <p class="sync-onboarding-hint">
          {{ t('syncOnboarding.generatedDescription') }}
        </p>
        <div class="qr-card">
          <QrcodeVue :value="generatedQrValue" :size="200" level="H" render-as="svg" />
        </div>
        <el-alert
          :title="t('sync.qrSecurityWarning')"
          type="warning"
          :closable="false"
          show-icon
        />
        <el-input :model-value="settingsStore.syncKey" readonly>
          <template #append>
            <el-button @click="copyKey">
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </template>
        </el-input>
        <el-button type="primary" class="sync-option" @click="closeDialog">
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </div>
  </el-dialog>

  <SyncKeyScannerDialog v-model="isScannerVisible" @scanned="useScannedKey" />
</template>

<style scoped>
.sync-onboarding {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.sync-onboarding-description,
.sync-onboarding-hint {
  margin: 0;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  font-size: 0.9rem;
}

.sync-option {
  width: 100%;
  margin-left: 0 !important;
}

.skip-btn {
  align-self: center;
}

.sync-onboarding-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
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
