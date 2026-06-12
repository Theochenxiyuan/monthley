import { computed, onMounted, onUnmounted, ref } from 'vue';

const STORAGE_KEY = 'main-app-horizontal-offset';
const APP_WIDTH = 720;
const SAFE_PADDING = 8;
const DESKTOP_MIN_WIDTH = 768;

const offsetX = ref(0);
const isDraggingApp = ref(false);
let dragStartX = 0;
let dragStartOffset = 0;
let activePointerId: number | null = null;
let initialized = false;
let usageCount = 0;

function clampOffset(nextOffset: number): number {
  if (window.innerWidth < DESKTOP_MIN_WIDTH) return 0;
  const available = Math.max(0, (window.innerWidth - APP_WIDTH) / 2 - SAFE_PADDING);
  return Math.min(Math.max(nextOffset, -available), available);
}

function readStoredOffset(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function persistOffset() {
  localStorage.setItem(STORAGE_KEY, String(offsetX.value));
}

function setOffset(nextOffset: number, shouldPersist = true) {
  offsetX.value = clampOffset(nextOffset);
  if (shouldPersist) persistOffset();
}

function resetAppOffset() {
  localStorage.removeItem(STORAGE_KEY);
  offsetX.value = 0;
}

function handlePointerMove(event: PointerEvent) {
  if (!isDraggingApp.value || activePointerId !== event.pointerId) return;
  event.preventDefault();
  offsetX.value = clampOffset(dragStartOffset + event.clientX - dragStartX);
}

function stopDraggingApp(event?: PointerEvent) {
  if (!isDraggingApp.value) return;
  if (event && activePointerId !== event.pointerId) return;
  isDraggingApp.value = false;
  activePointerId = null;
  persistOffset();
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', stopDraggingApp);
  window.removeEventListener('pointercancel', stopDraggingApp);
}

function startDraggingApp(event: PointerEvent) {
  if (event.button !== 0 || window.innerWidth < DESKTOP_MIN_WIDTH) return;
  event.preventDefault();
  activePointerId = event.pointerId;
  isDraggingApp.value = true;
  dragStartX = event.clientX;
  dragStartOffset = offsetX.value;
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopDraggingApp);
  window.addEventListener('pointercancel', stopDraggingApp);
}

function handleResize() {
  setOffset(offsetX.value, false);
}

function initOffset() {
  if (initialized) return;
  initialized = true;
  setOffset(readStoredOffset(), false);
  window.addEventListener('resize', handleResize);
}

function destroyOffset() {
  usageCount -= 1;
  if (usageCount > 0) return;
  stopDraggingApp();
  window.removeEventListener('resize', handleResize);
  initialized = false;
}

export function useDesktopAppOffset() {
  onMounted(() => {
    usageCount += 1;
    initOffset();
  });
  onUnmounted(destroyOffset);

  const appOffsetStyle = computed(() => ({
    transform: `translateX(${offsetX.value}px)`,
  }));

  return {
    appOffsetStyle,
    isDraggingApp,
    offsetX,
    resetAppOffset,
    startDraggingApp,
  };
}
