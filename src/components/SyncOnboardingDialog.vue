<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DocumentCopy } from '@element-plus/icons-vue';
import { useSettingsStore } from '@/stores/settings';
import { useSync } from '@/composables/useSync';

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

const isValidKey = computed(() => /^[a-zA-Z0-9]{8,32}$/.test(inputKey.value));

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
  } catch {
    ElMessage.error(t('sync.syncFailed'));
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
  } catch {
    settingsStore.syncKey = null;
    ElMessage.error(t('sync.syncFailed'));
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
    ElMessage.success(t('syncOnboarding.copySuccess'));
  } catch {
    ElMessage.error(t('syncOnboarding.copyFailed'));
  }
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
          <el-button type="primary" :disabled="!isValidKey" :loading="isWorking" @click="useExistingKey">
            {{ t('common.confirm') }}
          </el-button>
        </div>
      </template>

      <template v-else>
        <p class="sync-onboarding-hint">
          {{ t('syncOnboarding.generatedDescription') }}
        </p>
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
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
