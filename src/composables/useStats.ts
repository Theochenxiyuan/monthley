import { computed } from 'vue';
import { useTimelineStore } from '@/stores/timeline';
import type { EntryStatus, EntryType } from '@/types/models';
import { entryTypes, entryStatuses } from '@/types/models';

export interface TypeStat {
  type: EntryType;
  count: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

export interface StatusStat {
  status: EntryStatus;
  count: number;
  percentage: number;
}

export interface YearHeatmapCell {
  year: number;
  month: number;
  count: number;
  label: string;
}

export interface MonthlyTrendItem {
  year: number;
  month: number;
  total: number;
  completed: number;
  rate: number | null;
  label: string;
}

export function useStats() {
  const timelineStore = useTimelineStore();

  const allEntries = computed(() => {
    return timelineStore.allMonths.flatMap((m) => m.entries);
  });

  const totalCount = computed(() => allEntries.value.length);

  const completedCount = computed(() =>
    allEntries.value.filter((e) => e.status === 'completed').length,
  );

  const inProgressCount = computed(() =>
    allEntries.value.filter((e) => e.status === 'in_progress').length,
  );

  const notStartedCount = computed(() =>
    allEntries.value.filter((e) => e.status === 'not_started').length,
  );

  const completionRate = computed(() => {
    if (totalCount.value === 0) return 0;
    return Math.round((completedCount.value / totalCount.value) * 100);
  });

  const totalMonthsWithEntries = computed(() => timelineStore.allMonths.length);

  const typeStats = computed<TypeStat[]>(() => {
    return entryTypes.map((type) => {
      const entries = allEntries.value.filter((e) => e.type === type);
      return {
        type,
        count: entries.length,
        completed: entries.filter((e) => e.status === 'completed').length,
        inProgress: entries.filter((e) => e.status === 'in_progress').length,
        notStarted: entries.filter((e) => e.status === 'not_started').length,
      };
    });
  });

  const statusStats = computed<StatusStat[]>(() => {
    const total = totalCount.value || 1;
    return entryStatuses.map((status) => {
      const count = allEntries.value.filter((e) => e.status === status).length;
      return {
        status,
        count,
        percentage: Math.round((count / total) * 100),
      };
    });
  });

  const yearHeatmapData = computed<YearHeatmapCell[]>(() => {
    const months = timelineStore.allMonths;
    if (months.length === 0) return [];

    const firstYear = months[0].year;
    const now = new Date();
    const lastYear = now.getFullYear();

    const cells: YearHeatmapCell[] = [];
    for (let year = firstYear; year <= lastYear; year++) {
      for (let month = 1; month <= 12; month++) {
        const monthData = months.find(
          (m) => m.year === year && m.month === month,
        );
        const count = monthData ? monthData.entries.length : 0;
        cells.push({
          year,
          month,
          count,
          label: `${year}-${String(month).padStart(2, '0')}`,
        });
      }
    }
    return cells;
  });

  const years = computed(() => {
    const months = timelineStore.allMonths;
    if (months.length === 0) return [];
    const firstYear = months[0].year;
    const now = new Date();
    const lastYear = now.getFullYear();
    const result: number[] = [];
    for (let y = firstYear; y <= lastYear; y++) {
      result.push(y);
    }
    return result;
  });

  const monthlyTrend = computed<MonthlyTrendItem[]>(() => {
    const months = timelineStore.allMonths;
    if (months.length === 0) return [];

    const now = new Date();
    const result: MonthlyTrendItem[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthData = months.find(
        (m) => m.year === year && m.month === month,
      );
      const entries = monthData ? monthData.entries : [];
      const total = entries.length;
      const completed = entries.filter((e) => e.status === 'completed').length;
      result.push({
        year,
        month,
        total,
        completed,
        rate: total > 0 ? Math.round((completed / total) * 100) : null,
        label: `${year}-${String(month).padStart(2, '0')}`,
      });
    }
    return result;
  });

  const streakMonths = computed(() => {
    const months = timelineStore.allMonths;
    if (months.length === 0) return 0;

    const sorted = [...months].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    let streak = 0;
    const now = new Date();
    let currentYear = now.getFullYear();
    let currentMonth = now.getMonth() + 1;

    const hasCurrentMonth = months.some(
      (m) => m.year === currentYear && m.month === currentMonth,
    );

    if (!hasCurrentMonth) {
      currentMonth--;
      if (currentMonth === 0) {
        currentMonth = 12;
        currentYear--;
      }
    }

    for (const m of sorted) {
      if (m.year === currentYear && m.month === currentMonth) {
        streak++;
        currentMonth--;
        if (currentMonth === 0) {
          currentMonth = 12;
          currentYear--;
        }
      } else {
        break;
      }
    }

    return streak;
  });

  return {
    totalCount,
    completedCount,
    inProgressCount,
    notStartedCount,
    completionRate,
    totalMonthsWithEntries,
    typeStats,
    statusStats,
    yearHeatmapData,
    years,
    monthlyTrend,
    streakMonths,
  };
}