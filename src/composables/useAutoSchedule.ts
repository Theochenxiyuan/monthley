import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
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
    plan: AutoSchedulePlanItem[];
  };
}

export function useAutoSchedule() {
  const { t } = useI18n();
  const timelineStore = useTimelineStore();
  const settingsStore = useSettingsStore();
  const isScheduling = ref(false);
  const schedulePlan = ref<DisplayPlanItem[]>([]);
  const confirmVisible = ref(false);

  async function requestAutoSchedule() {
    if (isScheduling.value) return;
    if (timelineStore.unscheduledEntries.length === 0) {
      ElMessage.info(t('autoSchedule.empty'));
      return;
    }

    if (!supabase) {
      ElMessage.error(t('sync.errorNotConfigured'));
      return;
    }

    try {
      await ElMessageBox.confirm(
        t('autoSchedule.preConfirmMessage'),
        t('autoSchedule.preConfirmTitle'),
        {
          confirmButtonText: t('autoSchedule.confirm'),
          cancelButtonText: t('autoSchedule.cancel'),
          type: 'info',
        },
      );
    } catch {
      return;
    }

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
        },
      });

      if (error) throw error;
      if (!data?.data?.plan) throw new Error('Auto schedule response is empty');

      const plan = data.data.plan.map((item) => {
        const entry = timelineStore.unscheduledEntries.find((e) => e.id === item.entryId);
        return {
          ...item,
          entryName: entry?.name ?? item.entryId,
          entryType: entry?.type ?? 'learn',
        };
      });

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
    const count = schedulePlan.value.length;
    timelineStore.batchMoveUnscheduled(schedulePlan.value);
    schedulePlan.value = [];
    ElMessage.success(t('autoSchedule.success', { count }));
  }

  return {
    isScheduling,
    schedulePlan,
    confirmVisible,
    requestAutoSchedule,
    confirmSchedule,
  };
}
