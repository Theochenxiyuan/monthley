<script setup lang="ts">
import EntryItem from './EntryItem.vue';
import AIScheduleConfirmDialog from './AIScheduleConfirmDialog.vue';
import Draggable from 'vuedraggable';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { MagicStick } from '@element-plus/icons-vue';
import { useDialogStore } from '@/stores/dialog';
import { useTimelineStore } from '@/stores/timeline';
import { useDraggablePanel } from '@/composables/useDraggablePanel';
import { useDesktopAppOffset } from '@/composables/useDesktopAppOffset';
import { useAutoSchedule } from '@/composables/useAutoSchedule';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const { t } = useI18n();
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();
const { isScheduling, schedulePlan: autoSchedulePlan, confirmVisible: autoScheduleConfirmVisible, requestAutoSchedule, confirmSchedule } = useAutoSchedule();
const panelRef = ref<HTMLElement | null>(null);
const { offsetX: appOffsetX, resetAppOffset } = useDesktopAppOffset();

const {
  alignToDefaultPosition,
  isDragging,
  isResizing,
  panelStyle,
  resetLayout,
  startDragging,
  startResizing,
} = useDraggablePanel(panelRef, {
  storageKey: 'unscheduled-panel-position',
  getDefaultPosition: () => ({
    x: window.innerWidth / 2 + appOffsetX.value + 372,
    y: 84,
  }),
  getDefaultSize: () => ({
    width: 220,
    height: Math.min(420, Math.max(window.innerHeight - 168, 260)),
  }),
  minWidth: 180,
  minHeight: 220,
  maxWidth: 360,
});

watch(appOffsetX, () => {
  alignToDefaultPosition();
});

function resetDesktopLayout() {
  resetAppOffset();
  resetLayout();
}

function handleResetDesktopLayout() {
  resetDesktopLayout();
}

onMounted(() => {
  window.addEventListener('monthley:reset-desktop-layout', handleResetDesktopLayout);
});

onUnmounted(() => {
  window.removeEventListener('monthley:reset-desktop-layout', handleResetDesktopLayout);
});

function handleDragChange() {
  timelineStore.lastUpdated = new Date();
  timelineStore.saveLocal();
}

function handleDelete(entryId: string): void {
  ElMessageBox.confirm(
    t('monthCard.confirmDelete'),
    t('monthCard.deleteEntry'),
    {
      confirmButtonText: t('monthCard.confirm'),
      cancelButtonText: t('monthCard.cancel'),
      type: 'info',
    },
  )
    .then(() => {
      timelineStore.deleteUnscheduledEntry(entryId);
      ElMessage({
        type: 'success',
        message: t('monthCard.deleteSuccess'),
      });
    })
    .catch(() => {});
}
</script>

<template>
  <aside
    ref="panelRef"
    class="unscheduled-panel"
    :class="{
      'unscheduled-panel--dragging': isDragging,
      'unscheduled-panel--resizing': isResizing,
    }"
    :style="panelStyle"
  >
    <div class="unscheduled-header" @pointerdown="startDragging">
      <div class="unscheduled-drag-handle">
        <div class="unscheduled-title">{{ t('unscheduled.title') }}</div>
        <div class="unscheduled-count">
          {{ t('unscheduled.count', { count: timelineStore.unscheduledEntries.length }) }}
        </div>
      </div>
      <div class="unscheduled-header-actions" @pointerdown.stop>
        <ElButton
          type="primary"
          text
          size="small"
          :title="t('unscheduled.aiSchedule')"
          :loading="isScheduling"
          @click="requestAutoSchedule"
        >
          <template #icon><MagicStick /></template>
        </ElButton>
        <ElButton
          type="primary"
          text
          size="small"
          :title="t('unscheduled.add')"
          @click="dialogStore.open({ isUnscheduled: true })"
        >
          <el-icon size="18"><Plus /></el-icon>
        </ElButton>
      </div>
    </div>

    <div class="unscheduled-body">
      <div v-if="timelineStore.unscheduledEntries.length === 0" class="unscheduled-empty">
        {{ t('common.none') }}
      </div>

      <Draggable
        v-model="timelineStore.unscheduledEntries"
        class="unscheduled-list"
        group="timeline"
        draggable=".timeline-entry-draggable"
        item-key="id"
        :delay="300"
        :delayOnTouchOnly="true"
        drag-class="drag"
        ghost-class="ghost"
        chosen-class="chosen"
        :animation="300"
        :empty-insert-threshold="120"
        @change="handleDragChange"
      >
        <template #item="entry">
          <div class="timeline-entry-draggable unscheduled-entry">
            <el-dropdown placement="bottom" trigger="click" size="large" teleported>
              <EntryItem :entry="entry.element" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    @click="timelineStore.moveUnscheduledToCurrentMonth(entry.element.id)"
                  >
                    <el-text size="large" type="primary">{{ t('monthCard.moveToCurrentMonth') }}</el-text>
                  </el-dropdown-item>
                  <el-dropdown-item
                    @click="
                      dialogStore.open(
                        {
                          isUnscheduled: true,
                          month: null,
                          ...entry.element,
                        },
                        entry.element.id,
                      )
                    "
                  >
                    <el-text size="large" type="warning">{{ t('monthCard.edit') }}</el-text>
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleDelete(entry.element.id)">
                    <el-text size="large" type="danger">{{ t('monthCard.delete') }}</el-text>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </Draggable>
    </div>

    <button
      type="button"
      class="unscheduled-resize-handle"
      :aria-label="t('unscheduled.resize')"
      :title="t('unscheduled.resize')"
      @pointerdown="startResizing"
      @dblclick="resetDesktopLayout"
    ></button>
  </aside>

  <AIScheduleConfirmDialog
    v-model="autoScheduleConfirmVisible"
    :plan="autoSchedulePlan"
    @confirm="confirmSchedule"
  />
</template>

<style scoped>
.unscheduled-panel {
  position: fixed;
  align-self: flex-start;
  width: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: color-mix(in srgb, var(--el-bg-color) 90%, transparent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
}

.unscheduled-panel--dragging,
.unscheduled-panel--resizing {
  z-index: 1200 !important;
  user-select: none;
}

.unscheduled-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  padding: 12px 10px 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: grab;
  touch-action: none;
}

.unscheduled-panel--dragging .unscheduled-header {
  cursor: grabbing;
}

.unscheduled-drag-handle {
  flex: 1;
  min-width: 0;
}

.unscheduled-header-actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 0 0 auto;
  margin-top: -2px;
  cursor: default;
  touch-action: auto;
}

.unscheduled-header-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.unscheduled-header-actions :deep(.el-button) {
  width: 26px;
  height: 26px;
  padding: 0;
}

.unscheduled-title {
  color: var(--el-text-color-primary);
  font-size: 0.95rem;
  font-weight: 700;
}

.unscheduled-count {
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  font-size: 0.75rem;
}

.unscheduled-body {
  flex: 1;
  position: relative;
  min-height: 0;
  min-width: 0;
  display: flex;
}

.unscheduled-list {
  flex: 1;
  position: relative;
  z-index: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  box-sizing: border-box;
  user-select: none;
}

.unscheduled-entry {
  order: 1;
  width: max-content;
  max-width: 100%;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.unscheduled-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  user-select: none;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  line-height: 1.5;
}

.drag > div {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  opacity: 0.9;
  z-index: 100;
}

.chosen > div {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  opacity: 1;
}

:deep(.sortable-drag) {
  position: fixed !important;
  z-index: 9999 !important;
  opacity: 1 !important;
  pointer-events: none;
  user-select: none;
}

.ghost {
  background: var(--el-color-primary-light-8);
  border-radius: 6px;
  outline: 2px dashed var(--el-color-primary);
  opacity: 0.6;
}

.unscheduled-resize-handle {
  position: absolute;
  right: 3px;
  bottom: 3px;
  z-index: 2;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: nwse-resize;
  touch-action: none;
}

.unscheduled-resize-handle::before,
.unscheduled-resize-handle::after {
  content: '';
  position: absolute;
  right: 5px;
  bottom: 2px;
  height: 1px;
  border-radius: 999px;
  background: var(--el-text-color-placeholder);
  transform: rotate(135deg);
  transform-origin: right center;
}

.unscheduled-resize-handle::before {
  width: 10px;
}

.unscheduled-resize-handle::after {
  width: 6px;
  bottom: 8px;
}

.unscheduled-resize-handle:hover::before,
.unscheduled-resize-handle:hover::after,
.unscheduled-panel--resizing .unscheduled-resize-handle::before,
.unscheduled-panel--resizing .unscheduled-resize-handle::after {
  background: var(--el-color-primary);
}
</style>
