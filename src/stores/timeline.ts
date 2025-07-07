import { defineStore } from 'pinia';
import type {
  TimelineState,
  TimelineMonth,
  TimelineEntry,
  EntryStatus,
} from '@/types/models';

const getNextStatus = (status: EntryStatus): EntryStatus => {
  if (status === 'not_started') {
    return 'in_progress';
  }
  return 'completed';
};

export const useTimelineStore = defineStore('timeline', {
  state: (): TimelineState => ({
    months: [],
    lastSynced: null,
  }),
  getters: {
    count(): number {
      return this.months.length;
    },
    allMonths(): TimelineMonth[] {
      if (this.months.length === 0) {
      }
      return [...this.months].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    },
    timelineWithCurrentMonth(): TimelineMonth[] {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12

      // 检查是否已存在当前月
      const hasCurrentMonth = this.months.some(
        (m) => m.year === currentYear && m.month === currentMonth
      );

      // 合并现有月份和当前月（如不存在）
      const months = hasCurrentMonth
        ? [...this.months]
        : [
            ...this.months,
            { year: currentYear, month: currentMonth, entries: [] },
          ];

      // 按时间排序
      return months.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    },
  },
  actions: {
    _saveTimer: null as number | null,
    loadLocal() {
      try {
        const saved = localStorage.getItem('timeline');
        if (saved) {
          const timeline = JSON.parse(saved);
          this.months = timeline.months;
          this.lastSynced = timeline.lastSynced
            ? new Date(timeline.lastSynced)
            : null;
        }
      } catch (err) {
        console.error('Error loading local data:', err);
      }
    },
    saveLocal() {
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(
            'timeline',
            JSON.stringify({
              months: this.months,
              lastSynced: this.lastSynced?.toISOString(),
            })
          );
        } catch (err) {
          console.error('Error saving local data:', err);
        } finally {
          this._saveTimer = null;
        }
      }, 500);
    },
    addEntry(
      monthYear: Omit<TimelineMonth, 'entries'>,
      entry: Omit<TimelineEntry, 'id' | 'orderIndex'>
    ) {
      const targetMonth = this.months.find(
        (m) => m.year === monthYear.year && m.month === monthYear.month
      );
      const newEntry: TimelineEntry = {
        ...entry,
        id: crypto.randomUUID(),
        orderIndex: (targetMonth?.entries.length || 0) + 1,
      };
      if (targetMonth) {
        targetMonth.entries.push(newEntry);
      } else {
        this.months.push({ ...monthYear, entries: [newEntry] });
        this.sortMonths();
      }
      this.saveLocal();
    },
    deleteEntry(monthYear: Omit<TimelineMonth, 'entries'>, entryId: string) {
      const month = this.months.find(
        (m) => m.year === monthYear.year && m.month === monthYear.month
      );
      if (month) {
        month.entries = month.entries.filter((entry) => entry.id !== entryId);
        if (month.entries.length === 0) {
          this.months = this.months.filter((m) => m !== month);
        }
        this.saveLocal();
      }
    },
    updateEntry(
      monthYear: Omit<TimelineMonth, 'entries'>,
      newEntryData: Omit<TimelineEntry, 'orderIndex'>
    ) {
      const month = this.months.find(
        (m) => m.year === monthYear.year && m.month === monthYear.month
      );
      if (month) {
        console.log(newEntryData);
        month.entries.forEach((entry) => {
          if (entry.id === newEntryData.id) {
            entry.name = newEntryData.name;
            entry.status = newEntryData.status;
            entry.type = newEntryData.type;
            this.saveLocal();
            return;
          }
        });
      }
    },
    moveBetweenMonth(
      entryId: string,
      oldMonth: Omit<TimelineMonth, 'entries'>,
      newMonth: Omit<TimelineMonth, 'entries'>
    ) {
      const sourceMonth = this.months.find(
        (m) => m.year === oldMonth.year && m.month === oldMonth.month
      );
      if (!sourceMonth) return false;

      const entryIndex = sourceMonth.entries.findIndex((e) => e.id === entryId);
      if (entryIndex === -1) return false;

      const [entryToMove] = sourceMonth.entries.splice(entryIndex, 1);

      if (sourceMonth.entries.length === 0) {
        this.months = this.months.filter((m) => m !== sourceMonth);
      }

      let targetMonth = this.months.find(
        (m) => m.year === newMonth.year && m.month === newMonth.month
      );
      if (!targetMonth) {
        targetMonth = { ...newMonth, entries: [] };
        this.months.push(targetMonth);
        this.sortMonths();
      }

      targetMonth.entries.push(entryToMove);

      this.saveLocal();
      return true;
    },
    toNextStatus(monthYear: Omit<TimelineMonth, 'entries'>, entryId: string) {
      const month = this.months.find(
        (m) => m.year === monthYear.year && m.month === monthYear.month
      );
      if (month) {
        month.entries.forEach((entry) => {
          if (entry.id === entryId) {
            entry.status = getNextStatus(entry.status);
            this.saveLocal();
            return;
          }
        });
      }
    },
    sortMonths() {
      this.months.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    },

    clearData() {
      this.months = [];
      this.lastSynced = null;
      localStorage.removeItem('timeline');
    },
  },
});
