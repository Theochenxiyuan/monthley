import { computed, type Ref } from 'vue';
import { useTimelineStore } from '@/stores/timeline';
import type { EntryType } from '@/types/models';
import { entryTypes } from '@/types/models';

export interface YearData {
  year: number;
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
  activeMonths: number;
  streakMonths: number;
  typeBreakdown: Record<EntryType, number>;
  topMonth: { month: number; count: number } | null;
}

export function useYearSummary(year: Ref<number>) {
  const timelineStore = useTimelineStore();

  const yearData = computed<YearData | null>(() => {
    const y = year.value;
    const months = timelineStore.allMonths.filter((m) => m.year === y);
    if (months.length === 0) return null;

    const entries = months.flatMap((m) => m.entries);
    const total = entries.length;
    if (total === 0) return null;

    const completed = entries.filter((e) => e.status === 'completed').length;
    const inProgress = entries.filter((e) => e.status === 'in_progress').length;
    const notStarted = entries.filter((e) => e.status === 'not_started').length;

    const typeBreakdown = {} as Record<EntryType, number>;
    for (const type of entryTypes) {
      typeBreakdown[type] = entries.filter((e) => e.type === type).length;
    }

    const monthsWithEntries = months.filter((m) => m.entries.length > 0);
    const topMonth = monthsWithEntries.length > 0
      ? monthsWithEntries.reduce((best, m) =>
          m.entries.length > best.count ? { month: m.month, count: m.entries.length } : best,
          { month: monthsWithEntries[0].month, count: monthsWithEntries[0].entries.length },
        )
      : null;

    let streakMonths = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let checkYear = currentYear;
    let checkMonth = currentMonth;

    if (y < currentYear) {
      checkYear = y;
      checkMonth = 12;
    }

    for (let i = 0; i < 12; i++) {
      if (months.some((m) => m.month === checkMonth && m.entries.length > 0)) {
        streakMonths++;
      } else {
        break;
      }
      checkMonth--;
      if (checkMonth === 0) {
        checkMonth = 12;
        checkYear--;
        if (checkYear !== y) break;
      }
    }

    return {
      year: y,
      total,
      completed,
      inProgress,
      notStarted,
      completionRate: Math.round((completed / total) * 100),
      activeMonths: monthsWithEntries.length,
      streakMonths,
      typeBreakdown,
      topMonth,
    };
  });

  const availableYears = computed(() => {
    const allMonths = timelineStore.allMonths;
    if (allMonths.length === 0) return [];
    const firstYear = allMonths[0].year;
    const now = new Date();
    const lastYear = now.getFullYear();
    const result: number[] = [];
    for (let y = firstYear; y <= lastYear; y++) {
      result.push(y);
    }
    return result;
  });

  return { yearData, availableYears };
}