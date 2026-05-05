import type { TimelineState, TimelineMonth, TimelineEntry } from '@/types/models';
import { entryStatuses, entryTypes } from '@/types/models';

const STORAGE_KEY = 'timeline';

export interface ExportData {
  months: TimelineMonth[];
  lastUpdated: string | null;
}

const entryTypeSet = new Set<string>(entryTypes);
const entryStatusSet = new Set<string>(entryStatuses);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidMonthValue(year: unknown, month: unknown): boolean {
  return (
    typeof year === 'number' &&
    typeof month === 'number' &&
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 1900 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12
  );
}

function normalizeLastUpdated(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeEntry(value: unknown, seenEntryIds: Set<string>): TimelineEntry | null {
  if (!isRecord(value)) return null;
  const { id, name, type, status, notes } = value;
  if (
    typeof id !== 'string' ||
    id.trim() === '' ||
    seenEntryIds.has(id) ||
    typeof name !== 'string' ||
    name.trim() === '' ||
    typeof type !== 'string' ||
    !entryTypeSet.has(type) ||
    typeof status !== 'string' ||
    !entryStatusSet.has(status)
  ) {
    return null;
  }

  seenEntryIds.add(id);

  return {
    id,
    name,
    type: type as TimelineEntry['type'],
    status: status as TimelineEntry['status'],
    ...(typeof notes === 'string' ? { notes } : {}),
  };
}

function normalizeMonth(value: unknown, seenEntryIds: Set<string>): TimelineMonth | null {
  if (!isRecord(value)) return null;
  const { year, month, entries } = value;
  if (!isValidMonthValue(year, month) || !Array.isArray(entries)) return null;

  const normalizedYear = year as number;
  const normalizedMonth = month as number;

  return {
    year: normalizedYear,
    month: normalizedMonth,
    entries: entries
      .map((entry) => normalizeEntry(entry, seenEntryIds))
      .filter((entry): entry is TimelineEntry => entry !== null),
  };
}

export const dataService = {
  validateTimelineData(value: unknown): ExportData {
    if (!isRecord(value) || !Array.isArray(value.months)) {
      throw new Error('Invalid timeline data format');
    }

    const seenEntryIds = new Set<string>();
    const monthsByKey = new Map<string, TimelineMonth>();

    value.months.forEach((rawMonth) => {
      const month = normalizeMonth(rawMonth, seenEntryIds);
      if (!month) return;

      const key = `${month.year}-${month.month}`;
      const existing = monthsByKey.get(key);
      if (existing) {
        existing.entries.push(...month.entries);
      } else {
        monthsByKey.set(key, month);
      }
    });

    return {
      months: [...monthsByKey.values()].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      }),
      lastUpdated: normalizeLastUpdated(value.lastUpdated),
    };
  },

  exportJSON(state: TimelineState): void {
    const exportData: ExportData = {
      months: state.months,
      lastUpdated: state.lastUpdated?.toISOString() || null,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const date = new Date();
    const filename = `timeline-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  async importJSON(file: File): Promise<ExportData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          resolve(dataService.validateTimelineData(json));
        } catch (error) {
          reject(new Error('Failed to parse timeline data'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  },

  mergeImportData(existing: TimelineState, imported: ExportData): TimelineState {
    const existingMonthKeys = new Set(
      existing.months.map((m) => `${m.year}-${m.month}`)
    );
    const importedMonths = [...imported.months];

    importedMonths.forEach((importedMonth) => {
      const key = `${importedMonth.year}-${importedMonth.month}`;
      
      if (!existingMonthKeys.has(key)) {
        existing.months.push(importedMonth);
      } else {
        const existingMonth = existing.months.find(
          (m) => m.year === importedMonth.year && m.month === importedMonth.month
        );
        if (existingMonth) {
          const existingEntryIds = new Set(existingMonth.entries.map((entry) => entry.id));
          existingMonth.entries.push(
            ...importedMonth.entries.filter((entry) => !existingEntryIds.has(entry.id)),
          );
        }
      }
    });

    existing.months = existing.months.filter(
      (month) => month.entries.length > 0
    );
    existing.months.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    existing.lastUpdated = imported.lastUpdated
      ? new Date(imported.lastUpdated)
      : new Date();

    return existing;
  },
};
