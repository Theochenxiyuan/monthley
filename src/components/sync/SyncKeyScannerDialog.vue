<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IScannerControls } from '@zxing/browser';
import { parseSyncKeyQrValue } from '@/utils/syncKey';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  scanned: [syncKey: string];
}>();

const { t } = useI18n();
const videoRef = useTemplateRef<HTMLVideoElement>('scannerVideo');

const controls = shallowRef<IScannerControls | null>(null);
const isScanning = shallowRef(false);
const errorText = shallowRef('');
const hasResult = shallowRef(false);
let releaseScannerStreams: (() => void) | null = null;

function stopScanner(activeControls: IScannerControls | null = controls.value) {
  activeControls?.stop();
  controls.value = null;
  releaseScannerStreams?.();

  const video = videoRef.value;
  if (video) {
    video.srcObject = null;
  }

  isScanning.value = false;
}

async function startScanner() {
  await nextTick();
  const video = videoRef.value;
  if (!video || controls.value) return;

  errorText.value = '';
  hasResult.value = false;
  isScanning.value = true;

  try {
    const { BrowserQRCodeReader } = await import('@zxing/browser');
    const codeReader = new BrowserQRCodeReader();
    releaseScannerStreams = () => BrowserQRCodeReader.releaseAllStreams();

    if (!props.modelValue) {
      stopScanner();
      return;
    }

    const scannerControls = await codeReader.decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      },
      video,
      (result, _error, activeControls) => {
        if (!result || hasResult.value) return;

        const syncKey = parseSyncKeyQrValue(result.getText());
        if (!syncKey) {
          errorText.value = t('sync.invalidQrCode');
          return;
        }

        hasResult.value = true;
        stopScanner(activeControls);
        emit('scanned', syncKey);
        emit('update:modelValue', false);
      },
    );

    if (!props.modelValue || hasResult.value) {
      stopScanner(scannerControls);
      return;
    }

    controls.value = scannerControls;
  } catch {
    errorText.value = t('sync.cameraUnavailable');
    isScanning.value = false;
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      startScanner();
      return;
    }

    stopScanner();
  },
);

onBeforeUnmount(stopScanner);
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    :title="t('sync.scanQrCode')"
    width="min(92%, 420px)"
    align-center
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="sync-key-scanner">
      <div class="scanner-frame">
        <video ref="scannerVideo" class="scanner-video" muted playsinline />
        <div v-if="isScanning" class="scanner-corners" aria-hidden="true" />
      </div>

      <el-text v-if="errorText" type="danger" size="small">
        {{ errorText }}
      </el-text>
      <el-text v-else type="info" size="small">
        {{ t('sync.scanQrHint') }}
      </el-text>
    </div>
  </el-dialog>
</template>

<style scoped>
.sync-key-scanner {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.scanner-frame {
  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 14px;
  background-color: #111111;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner-corners {
  position: absolute;
  inset: 14%;
  border: 2px solid rgba(255, 255, 255, 0.84);
  border-radius: 12px;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.25);
}
</style>
