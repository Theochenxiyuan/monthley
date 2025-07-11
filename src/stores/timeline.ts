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
    lastUpdated: null,
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
    init() {
      this.loadLocal();
      this.clearEmptyMonths();
    },
    loadLocal() {
      try {
        const saved = localStorage.getItem('timeline');
        if (saved) {
          const timeline = JSON.parse(saved);
          this.months = timeline.months;
          this.lastUpdated = timeline.lastUpdated
            ? new Date(timeline.lastUpdated)
            : null;
        }
      } catch (err) {
        console.error('Error loading local data:', err);
      }
    },
    _saveNow() {
      try {
        localStorage.setItem(
          'timeline',
          JSON.stringify({
            months: this.months,
            lastUpdated: this.lastUpdated?.toISOString(),
          })
        );
      } catch (err) {
        console.error('Save failed:', err);
      }
    },
    saveLocal() {
      if (this._saveTimer) clearTimeout(this._saveTimer);

      // 添加时间戳验证
      const saveTime = this.lastUpdated?.getTime() || 0;
      const now = Date.now();

      // 避免过于频繁的保存（5秒内变化只存最后一次）
      if (now - saveTime < 5000) {
        this._saveTimer = setTimeout(() => this._saveNow(), 500);
      } else {
        this._saveNow();
      }
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
      };
      if (targetMonth) {
        targetMonth.entries.push(newEntry);
      } else {
        this.months.push({ ...monthYear, entries: [newEntry] });
        this.sortMonths();
      }
      this.lastUpdated = new Date();
      this.saveLocal();
    },
    deleteEntry(monthYear: Omit<TimelineMonth, 'entries'>, entryId: string) {
      const month = this.months.find(
        (m) => m.year === monthYear.year && m.month === monthYear.month
      );
      if (month) {
        month.entries = month.entries.filter((entry) => entry.id !== entryId);
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
            this.lastUpdated = new Date();
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

      let targetMonth = this.months.find(
        (m) => m.year === newMonth.year && m.month === newMonth.month
      );
      if (!targetMonth) {
        targetMonth = { ...newMonth, entries: [] };
        this.months.push(targetMonth);
        this.sortMonths();
      }

      targetMonth.entries.push(entryToMove);
      this.lastUpdated = new Date();
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
            this.lastUpdated = new Date();
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
    clearEmptyMonths() {
      // 过滤掉没有 entries 的月份
      this.months = this.months.filter((month) => month.entries.length > 0);
      this.saveLocal();
    },
    clearData() {
      this.months = [];
      this.lastUpdated = null;
      localStorage.removeItem('timeline');
    },
  },
});
