import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { supabase } from '@/lib/supabase';
import { useTimelineStore } from '@/stores/timeline';
import { useSettingsStore } from '@/stores/settings';
import type { AutoSchedulePlanItem, EntryType } from '@/types/models';

type DisplayPlanItem = AutoSchedulePlanItem & {
  entryName: string;
  entryType: EntryType;
};

interface AutoScheduleResponse {
  data: {
    plan: unknown;
  };
}

function isValidPlanItem(value: unknown): value is AutoSchedulePlanItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.entryId === 'string' &&
    item.entryId.length > 0 &&
    typeof item.targetYear === 'number' &&
    Number.isInteger(item.targetYear) &&
    item.targetYear >= 1900 &&
    item.targetYear <= 9999 &&
    typeof item.targetMonth === 'number' &&
    Number.isInteger(item.targetMonth) &&
    item.targetMonth >= 1 &&
    item.targetMonth <= 12 &&
    typeof item.reason === 'string'
  );
}

export function useAutoSchedule() {
  const { t } = useI18n();
  const timelineStore = useTimelineStore();
  const settingsStore = useSettingsStore();
  const isScheduling = ref(false);
  const schedulePlan = ref<DisplayPlanItem[]>([]);
  const confirmVisible = ref(false);
  const promptVisible = ref(false);

  function requestAutoSchedule() {
    if (isScheduling.value) return;
    if (timelineStore.unscheduledEntries.length === 0) {
      ElMessage.info(t('autoSchedule.empty'));
      return;
    }

    if (!supabase) {
      ElMessage.error(t('sync.errorNotConfigured'));
      return;
    }

    promptVisible.value = true;
  }

  async function performAutoSchedule() {
    if (isScheduling.value) return;
    if (!supabase) {
      ElMessage.error(t('sync.errorNotConfigured'));
      return;
    }

    promptVisible.value = false;
    isScheduling.value = true;
    try {
      const now = new Date();
      const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const futureMonths = timelineStore.allMonths.filter(
        (m) => m.year > now.getFullYear() || (m.year === now.getFullYear() && m.month >= now.getMonth() + 1),
      );

      const locale = settingsStore.language === 'en-US' ? 'en-US' : 'zh-CN';

      const { data, error } = await supabase.functions.invoke<AutoScheduleResponse>('auto-schedule', {
        body: {
          unscheduled: timelineStore.unscheduledEntries.map((e) => ({
            id: e.id,
            name: e.name,
            type: e.type,
            status: e.status,
            notes: e.notes,
          })),
          months: futureMonths.map((m) => ({
            year: m.year,
            month: m.month,
            entries: m.entries.map((e) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              status: e.status,
              notes: e.notes,
            })),
          })),
          currentDate,
          locale,
          userInstruction: settingsStore.autoSchedulePrompt.trim(),
        },
      });

      if (error) throw error;
      if (!Array.isArray(data?.data?.plan)) throw new Error('Auto schedule response is empty');

      const entryMap = new Map(timelineStore.unscheduledEntries.map((entry) => [entry.id, entry]));
      const seenEntryIds = new Set<string>();
      if (data.data.plan.length !== entryMap.size) {
        throw new Error('Auto schedule response is incomplete');
      }

      const plan = data.data.plan.map<DisplayPlanItem>((item) => {
        if (!isValidPlanItem(item)) {
          throw new Error('Auto schedule response contains an invalid plan item');
        }
        const entry = entryMap.get(item.entryId);
        const targetIsPast = item.targetYear < now.getFullYear() || (
          item.targetYear === now.getFullYear() && item.targetMonth < now.getMonth() + 1
        );

        if (!entry || seenEntryIds.has(item.entryId) || targetIsPast) {
          throw new Error('Auto schedule response contains an invalid target');
        }

        seenEntryIds.add(item.entryId);
        return {
          ...item,
          entryName: entry.name,
          entryType: entry.type,
        };
      });

      if (seenEntryIds.size !== entryMap.size) {
        throw new Error('Auto schedule response does not cover every entry');
      }

      schedulePlan.value = plan;
      confirmVisible.value = true;
    } catch (err) {
      console.error('Auto schedule failed:', err);
      ElMessage.error(t('autoSchedule.error'));
    } finally {
      isScheduling.value = false;
    }
  }

  function confirmSchedule() {
    const firstItem = schedulePlan.value[0];
    if (!firstItem) return null;
    const count = schedulePlan.value.length;
    if (!timelineStore.batchMoveUnscheduled(schedulePlan.value)) {
      ElMessage.error(t('autoSchedule.error'));
      return null;
    }
    schedulePlan.value = [];
    ElMessage.success(t('autoSchedule.success', { count }));
    return firstItem;
  }

  return {
    isScheduling,
    schedulePlan,
    confirmVisible,
    promptVisible,
    requestAutoSchedule,
    performAutoSchedule,
    confirmSchedule,
  };
}
