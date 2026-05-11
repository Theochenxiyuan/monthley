import type { TimelineState, TimelineMonth, TimelineEntry } from '@/types/models';
import { entryStatuses, entryTypes } from '@/types/models';

export interface ExportData {
  months: TimelineMonth[];
  lastUpdated: string | null;
}

export interface ImportResult {
  importedEntryCount: number;
  restoredEntryCount: number;
  totalEntryCount: number;
}

const entryTypeSet = new Set<string>(entryTypes);
const entryStatusSet = new Set<string>(entryStatuses);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLastUpdated(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

  return {
    year: year as number,
    month: month as number,
    entries: entries
      .map((entry) => normalizeEntry(entry, seenEntryIds))
      .filter((entry): entry is TimelineEntry => entry !== null),
  };
}

function countEntries(months: TimelineMonth[]): number {
  return months.reduce((total, month) => total + month.entries.length, 0);
}

function collectEntryIds(months: TimelineMonth[]): Set<string> {
  return new Set(months.flatMap((month) => month.entries.map((entry) => entry.id)));
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
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
      months: [...monthsByKey.values()]
        .filter((month) => month.entries.length > 0)
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        }),
      lastUpdated: normalizeLastUpdated(value.lastUpdated),
    };
  },

  exportDataFromState(state: TimelineState): ExportData {
    return dataService.validateTimelineData({
      months: state.months,
      lastUpdated: state.lastUpdated?.toISOString() || null,
    });
  },

  async exportJSON(state: TimelineState): Promise<void> {
    const exportData = dataService.exportDataFromState(state);

    await waitForNextFrame();

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

  mergeImportData(existing: TimelineState, imported: ExportData): ImportResult {
    const importedEntryIds = collectEntryIds(imported.months);
    const existingEntryIds = collectEntryIds(existing.months);

    imported.months.forEach((importedMonth) => {
      const targetMonth = existing.months.find(
        (month) => month.year === importedMonth.year && month.month === importedMonth.month,
      );
      const entriesToAdd = importedMonth.entries.filter((entry) => !existingEntryIds.has(entry.id));

      entriesToAdd.forEach((entry) => existingEntryIds.add(entry.id));

      if (targetMonth) {
        targetMonth.entries.push(...entriesToAdd);
      } else if (entriesToAdd.length > 0) {
        existing.months.push({
          year: importedMonth.year,
          month: importedMonth.month,
          entries: entriesToAdd,
        });
      }
    });

    existing.months = existing.months
      .filter((month) => month.entries.length > 0)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    existing.lastUpdated = imported.lastUpdated ? new Date(imported.lastUpdated) : new Date();

    const mergedEntryIds = collectEntryIds(existing.months);

    return {
      importedEntryCount: importedEntryIds.size,
      restoredEntryCount: [...importedEntryIds].filter((entryId) => mergedEntryIds.has(entryId)).length,
      totalEntryCount: countEntries(existing.months),
    };
  },
};
