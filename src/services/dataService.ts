import type { TimelineState, TimelineMonth, TimelineEntry } from '@/types/models';
import { entryStatuses, entryTypes } from '@/types/models';

const LEGACY_ENTRY_UPDATED_AT = '1970-01-01T00:00:00.000Z';

export interface ExportData {
  months: TimelineMonth[];
  deletedEntries: Record<string, string>;
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

function latestIsoDate(...values: Array<string | null | undefined>): string | null {
  let latest: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;

  values.forEach((value) => {
    const normalized = normalizeLastUpdated(value);
    if (!normalized) return;
    const time = new Date(normalized).getTime();
    if (time > latestTime) {
      latest = normalized;
      latestTime = time;
    }
  });

  return latest;
}

function getEntryUpdatedAt(entry: TimelineEntry): string {
  return normalizeLastUpdated(entry.updatedAt) || LEGACY_ENTRY_UPDATED_AT;
}

function normalizeDeletedEntries(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([id, deletedAt]) => [id, normalizeLastUpdated(deletedAt)] as const)
      .filter((entry): entry is [string, string] => entry[0].trim() !== '' && entry[1] !== null)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function normalizeEntry(
  value: unknown,
  seenEntryIds: Set<string>,
  fallbackUpdatedAt: string,
): TimelineEntry | null {
  if (!isRecord(value)) return null;
  const { id, name, type, status, updatedAt, notes } = value;
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
    updatedAt: normalizeLastUpdated(updatedAt) || fallbackUpdatedAt,
    ...(typeof notes === 'string' ? { notes } : {}),
  };
}

function normalizeMonth(
  value: unknown,
  seenEntryIds: Set<string>,
  fallbackUpdatedAt: string,
): TimelineMonth | null {
  if (!isRecord(value)) return null;
  const { year, month, entries } = value;
  if (!isValidMonthValue(year, month) || !Array.isArray(entries)) return null;

  const normalizedYear = year as number;
  const normalizedMonth = month as number;

  return {
    year: normalizedYear,
    month: normalizedMonth,
    entries: entries
      .map((entry) => normalizeEntry(entry, seenEntryIds, fallbackUpdatedAt))
      .filter((entry): entry is TimelineEntry => entry !== null),
  };
}

function flattenEntries(months: TimelineMonth[]) {
  return months.flatMap((month) =>
    month.entries.map((entry, index) => ({
      entry,
      year: month.year,
      month: month.month,
      index,
    })),
  );
}

function buildMonths(entries: Array<{ entry: TimelineEntry; year: number; month: number; index: number }>): TimelineMonth[] {
  const monthsByKey = new Map<string, TimelineMonth & { order: number }>();

  entries.forEach(({ entry, year, month, index }) => {
    const key = `${year}-${month}`;
    const existing = monthsByKey.get(key);
    if (existing) {
      existing.entries.push(entry);
      existing.order = Math.min(existing.order, index);
    } else {
      monthsByKey.set(key, { year, month, entries: [entry], order: index });
    }
  });

  return [...monthsByKey.values()]
    .map(({ order, ...month }) => month)
    .filter((month) => month.entries.length > 0)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
}

export const dataService = {
  validateTimelineData(value: unknown): ExportData {
    if (!isRecord(value) || !Array.isArray(value.months)) {
      throw new Error('Invalid timeline data format');
    }

    const lastUpdated = normalizeLastUpdated(value.lastUpdated);
    const fallbackUpdatedAt = lastUpdated || LEGACY_ENTRY_UPDATED_AT;
    const deletedEntries = normalizeDeletedEntries(value.deletedEntries);
    const seenEntryIds = new Set<string>();
    const monthsByKey = new Map<string, TimelineMonth>();

    value.months.forEach((rawMonth) => {
      const month = normalizeMonth(rawMonth, seenEntryIds, fallbackUpdatedAt);
      if (!month) return;

      const key = `${month.year}-${month.month}`;
      const existing = monthsByKey.get(key);
      if (existing) {
        existing.entries.push(...month.entries);
      } else {
        monthsByKey.set(key, month);
      }
    });

    const months = [...monthsByKey.values()].map((month) => ({
      ...month,
      entries: month.entries.filter((entry) => {
        const deletedAt = deletedEntries[entry.id];
        if (!deletedAt) return true;
        return new Date(getEntryUpdatedAt(entry)).getTime() > new Date(deletedAt).getTime();
      }),
    })).filter((month) => month.entries.length > 0).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    return {
      months,
      deletedEntries,
      lastUpdated,
    };
  },

  exportDataFromState(state: TimelineState): ExportData {
    return dataService.validateTimelineData({
      months: state.months,
      deletedEntries: state.deletedEntries,
      lastUpdated: state.lastUpdated?.toISOString() || null,
    });
  },

  mergeTimelineData(local: ExportData, remote: ExportData): ExportData {
    const deletedEntries = normalizeDeletedEntries({
      ...local.deletedEntries,
      ...remote.deletedEntries,
    });

    Object.entries(local.deletedEntries).forEach(([id, deletedAt]) => {
      const remoteDeletedAt = remote.deletedEntries[id];
      deletedEntries[id] = latestIsoDate(deletedAt, remoteDeletedAt) || deletedAt;
    });

    const entriesById = new Map<string, { entry: TimelineEntry; year: number; month: number; index: number }>();
    let nextIndex = 0;

    [...flattenEntries(local.months), ...flattenEntries(remote.months)].forEach((item) => {
      const current = entriesById.get(item.entry.id);
      const candidate = { ...item, index: nextIndex++ };
      if (!current || new Date(getEntryUpdatedAt(item.entry)).getTime() > new Date(getEntryUpdatedAt(current.entry)).getTime()) {
        entriesById.set(item.entry.id, candidate);
      }
    });

    const entries = [...entriesById.values()].filter(({ entry }) => {
      const deletedAt = deletedEntries[entry.id];
      if (!deletedAt) return true;
      return new Date(getEntryUpdatedAt(entry)).getTime() > new Date(deletedAt).getTime();
    });

    const lastUpdated = latestIsoDate(
      local.lastUpdated,
      remote.lastUpdated,
      ...entries.map(({ entry }) => getEntryUpdatedAt(entry)),
      ...Object.values(deletedEntries),
    );

    return {
      months: buildMonths(entries),
      deletedEntries,
      lastUpdated,
    };
  },

  exportJSON(state: TimelineState): void {
    const exportData = dataService.exportDataFromState(state);

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
    const merged = dataService.mergeTimelineData(
      dataService.exportDataFromState(existing),
      imported,
    );

    existing.months = merged.months;
    existing.deletedEntries = merged.deletedEntries;
    existing.lastUpdated = merged.lastUpdated ? new Date(merged.lastUpdated) : new Date();

    return existing;
  },
};
