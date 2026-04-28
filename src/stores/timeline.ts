import { defineStore } from 'pinia';
import type {
  TimelineState,
  TimelineMonth,
  TimelineEntry,
  EntryStatus,
} from '@/types/models';
import { dataService } from '@/services/dataService';

const getNextStatus = (status: EntryStatus): EntryStatus => {
  if (status === 'not_started') {
    return 'in_progress';
  }
  return 'completed';
};

export const VISIBLE_WINDOW = 4;

export const useTimelineStore = defineStore('timeline', {
  state: (): TimelineState => ({
    months: [],
    lastUpdated: null,
    visibleUp: 0,
    visibleDown: 0,
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
    currentMonthIndex(): number {
      const now = new Date();
      const cy = now.getFullYear();
      const cm = now.getMonth() + 1;
      const idx = this.allMonths.findIndex(
        (m) => m.year === cy && m.month === cm,
      );
      return idx >= 0 ? idx : this.allMonths.length;
    },
    visibleMonths(): TimelineMonth[] {
      const all = this.allMonths;
      if (all.length === 0) return [];
      const ci = this.currentMonthIndex;
      const start = Math.max(0, ci - VISIBLE_WINDOW - this.visibleUp);
      const end = Math.min(all.length, ci + VISIBLE_WINDOW + 1 + this.visibleDown);
      return all.slice(start, end);
    },
    canLoadUp(): boolean {
      const all = this.allMonths;
      if (all.length === 0) return false;
      const ci = this.currentMonthIndex;
      return ci - VISIBLE_WINDOW - this.visibleUp > 0;
    },
    canLoadDown(): boolean {
      const all = this.allMonths;
      if (all.length === 0) return false;
      const ci = this.currentMonthIndex;
      return ci + VISIBLE_WINDOW + 1 + this.visibleDown < all.length;
    },
    nextMonthUp(): { year: number; month: number } | null {
      const all = this.allMonths;
      if (all.length === 0) return null;
      const ci = this.currentMonthIndex;
      const idx = ci - VISIBLE_WINDOW - this.visibleUp - 1;
      if (idx < 0) return null;
      return { year: all[idx].year, month: all[idx].month };
    },
    nextMonthDown(): { year: number; month: number } | null {
      const all = this.allMonths;
      if (all.length === 0) return null;
      const ci = this.currentMonthIndex;
      const idx = ci + VISIBLE_WINDOW + 1 + this.visibleDown;
      if (idx >= all.length) return null;
      return { year: all[idx].year, month: all[idx].month };
    },
  },
  actions: {
    _saveTimer: null as number | null,
    init() {
      this.loadLocal();
      this.clearEmptyMonths();
      this.addCurrentMonthIfMissing();
      this.resetVisible();
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
    addCurrentMonthIfMissing() {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // 检查是否已存在当前月，如果不存在则创建
      const hasCurrentMonth = this.months.some(
        (m) => m.year === currentYear && m.month === currentMonth
      );

      if (!hasCurrentMonth) {
        // 直接添加到 store 中，而不是返回时临时添加
        this.months.push({
          year: currentYear,
          month: currentMonth,
          entries: [],
        });
        this.sortMonths();
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
        this.lastUpdated = new Date();
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
      this.months = this.months.filter((month) => month.entries.length > 0);
      this.saveLocal();
    },
    loadMoreUp() {
      this.visibleUp += VISIBLE_WINDOW;
    },
    loadMoreDown() {
      this.visibleDown += VISIBLE_WINDOW;
    },
    loadAllUp() {
      const all = this.allMonths;
      const ci = this.currentMonthIndex;
      this.visibleUp = ci;
    },
    loadAllDown() {
      const all = this.allMonths;
      const ci = this.currentMonthIndex;
      this.visibleDown = all.length - ci - 1;
    },
    resetVisible() {
      this.visibleUp = 0;
      this.visibleDown = 0;
    },
    clearData() {
      this.months = [];
      this.lastUpdated = null;
      localStorage.removeItem('timeline');
    },
    exportJSON() {
      dataService.exportJSON(this);
    },
    async importJSON(file: File): Promise<void> {
      try {
        const importedData = await dataService.importJSON(file);
        dataService.mergeImportData(this, importedData);
        this.lastUpdated = new Date();
        this.saveLocal();
      } catch (error) {
        console.error('Import failed:', error);
        throw error;
      }
    },
  },
});
