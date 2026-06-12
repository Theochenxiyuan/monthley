<script setup lang="ts">
import EntryItem from './EntryItem.vue';
import Draggable from 'vuedraggable';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useDialogStore } from '@/stores/dialog';
import { useTimelineStore } from '@/stores/timeline';

const { t } = useI18n();
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();

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
  <aside class="unscheduled-panel">
    <div class="unscheduled-header">
      <div>
        <div class="unscheduled-title">{{ t('unscheduled.title') }}</div>
        <div class="unscheduled-count">
          {{ t('unscheduled.count', { count: timelineStore.unscheduledEntries.length }) }}
        </div>
      </div>
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

    <div class="unscheduled-body">
      <div v-if="timelineStore.unscheduledEntries.length === 0" class="unscheduled-empty">
        {{ t('common.none') }}
      </div>

      <Draggable
        v-model="timelineStore.unscheduledEntries"
        class="unscheduled-list"
        group="timeline"
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
          <div class="unscheduled-entry">
            <el-dropdown placement="bottom" trigger="click" size="large" teleported>
              <EntryItem :entry="entry.element" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="entry.element.status !== 'completed'"
                    @click="timelineStore.toNextStatusUnscheduled(entry.element.id)"
                  >
                    <el-text
                      size="large"
                      :type="entry.element.status === 'in_progress' ? 'success' : 'primary'"
                    >
                      {{ entry.element.status === 'in_progress' ? t('monthCard.complete') : t('monthCard.start') }}
                    </el-text>
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
  </aside>
</template>

<style scoped>
.unscheduled-panel {
  position: sticky;
  top: 72px;
  align-self: flex-start;
  width: 176px;
  max-height: calc(100vh - 148px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: color-mix(in srgb, var(--el-bg-color) 90%, transparent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
}

.unscheduled-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 12px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
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
  min-height: 160px;
  min-width: 0;
  display: flex;
}

.unscheduled-list {
  flex: 1;
  position: relative;
  z-index: 1;
  min-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  box-sizing: border-box;
  user-select: none;
}

.unscheduled-entry {
  width: max-content;
  max-width: 100%;
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
</style>
