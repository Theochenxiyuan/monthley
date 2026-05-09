import type { TimelineState, TimelineMonth, TimelineEntry } from '@/types/models';
import { entryStatuses, entryTypes } from '@/types/models';

const CURRENT_SCHEMA_VERSION = 2;
const LEGACY_ENTRY_UPDATED_AT = '1970-01-01T00:00:00.000Z';
const TOMBSTONE_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_TOMBSTONES = 5000;

export interface ExportData {
  schemaVersion: number;
  months: TimelineMonth[];
  deletedEntries: Record<string, string>;
  lastUpdated: string | null;
}

export interface MergeConflict {
  entryId: string;
  type: 'edit' | 'delete';
  resolution: 'local' | 'remote' | 'deleted' | 'updated';
}

export interface MergeResult {
  data: ExportData;
  conflicts: MergeConflict[];
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

function normalizeSchemaVersion(value: unknown): number {
  if (value === undefined || value === null) return 1;
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 1) {
    throw new Error('Invalid timeline schema version');
  }
  if (value > CURRENT_SCHEMA_VERSION) {
    throw new Error('Unsupported timeline schema version');
  }
  return value;
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

function normalizeOrder(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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

function pruneDeletedEntries(deletedEntries: Record<string, string>): Record<string, string> {
  const cutoff = Date.now() - TOMBSTONE_RETENTION_MS;
  const entries = Object.entries(deletedEntries)
    .map(([id, deletedAt]) => ({ id, deletedAt, time: new Date(deletedAt).getTime() }))
    .filter(({ id, time }) => id.trim() !== '' && !Number.isNaN(time) && time >= cutoff)
    .sort((a, b) => b.time - a.time)
    .slice(0, MAX_TOMBSTONES)
    .sort((a, b) => a.id.localeCompare(b.id));

  return Object.fromEntries(entries.map(({ id, deletedAt }) => [id, deletedAt]));
}

function normalizeEntry(
  value: unknown,
  seenEntryIds: Set<string>,
  fallbackUpdatedAt: string,
  fallbackOrder: number,
): TimelineEntry | null {
  if (!isRecord(value)) return null;
  const { id, name, type, status, order, updatedAt, notes } = value;
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
    order: normalizeOrder(order, fallbackOrder),
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
      .map((entry, index) => normalizeEntry(entry, seenEntryIds, fallbackUpdatedAt, index))
      .filter((entry): entry is TimelineEntry => entry !== null),
  };
}

function flattenEntries(months: TimelineMonth[]) {
  return months.flatMap((month) =>
    month.entries.map((entry, index) => ({
      entry,
      year: month.year,
      month: month.month,
      index: normalizeOrder(entry.order, index),
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
    .map((month) => ({
      ...month,
      entries: [...month.entries]
        .sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0))
        .map((entry, index) => ({ ...entry, order: index })),
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
}

function entriesById(data: ExportData) {
  return new Map(
    flattenEntries(data.months).map((item) => [item.entry.id, item]),
  );
}

function entrySignature(item: { entry: TimelineEntry; year: number; month: number }): string {
  return JSON.stringify({
    year: item.year,
    month: item.month,
    name: item.entry.name,
    type: item.entry.type,
    status: item.entry.status,
    notes: item.entry.notes || '',
    order: normalizeOrder(item.entry.order, 0),
  });
}

function collectMergeConflicts(local: ExportData, remote: ExportData): MergeConflict[] {
  const conflicts = new Map<string, MergeConflict>();
  const localEntries = entriesById(local);
  const remoteEntries = entriesById(remote);

  localEntries.forEach((localItem, entryId) => {
    const remoteItem = remoteEntries.get(entryId);
    if (!remoteItem) return;
    const localTime = new Date(getEntryUpdatedAt(localItem.entry)).getTime();
    const remoteTime = new Date(getEntryUpdatedAt(remoteItem.entry)).getTime();
    if (localTime !== remoteTime && entrySignature(localItem) !== entrySignature(remoteItem)) {
      conflicts.set(`edit:${entryId}`, {
        entryId,
        type: 'edit',
        resolution: localTime > remoteTime ? 'local' : 'remote',
      });
    }
  });

  localEntries.forEach((localItem, entryId) => {
    const deletedAt = remote.deletedEntries[entryId];
    if (!deletedAt) return;
    const entryTime = new Date(getEntryUpdatedAt(localItem.entry)).getTime();
    const deletedTime = new Date(deletedAt).getTime();
    if (entryTime !== deletedTime) {
      conflicts.set(`delete:${entryId}`, {
        entryId,
        type: 'delete',
        resolution: entryTime > deletedTime ? 'updated' : 'deleted',
      });
    }
  });

  remoteEntries.forEach((remoteItem, entryId) => {
    const deletedAt = local.deletedEntries[entryId];
    if (!deletedAt) return;
    const entryTime = new Date(getEntryUpdatedAt(remoteItem.entry)).getTime();
    const deletedTime = new Date(deletedAt).getTime();
    if (entryTime !== deletedTime) {
      conflicts.set(`delete:${entryId}`, {
        entryId,
        type: 'delete',
        resolution: entryTime > deletedTime ? 'updated' : 'deleted',
      });
    }
  });

  return [...conflicts.values()];
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

    normalizeSchemaVersion(value.schemaVersion);
    const lastUpdated = normalizeLastUpdated(value.lastUpdated);
    const fallbackUpdatedAt = lastUpdated || LEGACY_ENTRY_UPDATED_AT;
    const deletedEntries = pruneDeletedEntries(normalizeDeletedEntries(value.deletedEntries));
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
      entries: month.entries
        .filter((entry) => {
          const deletedAt = deletedEntries[entry.id];
          if (!deletedAt) return true;
          return new Date(getEntryUpdatedAt(entry)).getTime() > new Date(deletedAt).getTime();
        })
        .sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0))
        .map((entry, index) => ({ ...entry, order: index })),
    })).filter((month) => month.entries.length > 0).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      months,
      deletedEntries,
      lastUpdated,
    };
  },

  exportDataFromState(state: TimelineState): ExportData {
    return dataService.validateTimelineData({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      months: state.months,
      deletedEntries: state.deletedEntries,
      lastUpdated: state.lastUpdated?.toISOString() || null,
    });
  },

  cloneTimelineData(data: ExportData): ExportData {
    return dataService.validateTimelineData(JSON.parse(JSON.stringify(data)));
  },

  mergeTimelineDataDetailed(local: ExportData, remote: ExportData): MergeResult {
    const deletedEntries = normalizeDeletedEntries({
      ...local.deletedEntries,
      ...remote.deletedEntries,
    });
    const conflicts = collectMergeConflicts(local, remote);

    Object.entries(local.deletedEntries).forEach(([id, deletedAt]) => {
      const remoteDeletedAt = remote.deletedEntries[id];
      deletedEntries[id] = latestIsoDate(deletedAt, remoteDeletedAt) || deletedAt;
    });

    const prunedDeletedEntries = pruneDeletedEntries(deletedEntries);

    const entriesById = new Map<string, { entry: TimelineEntry; year: number; month: number; index: number }>();

    [...flattenEntries(local.months), ...flattenEntries(remote.months)].forEach((item) => {
      const current = entriesById.get(item.entry.id);
      if (!current || new Date(getEntryUpdatedAt(item.entry)).getTime() > new Date(getEntryUpdatedAt(current.entry)).getTime()) {
        entriesById.set(item.entry.id, item);
      }
    });

    const entries = [...entriesById.values()].filter(({ entry }) => {
      const deletedAt = prunedDeletedEntries[entry.id];
      if (!deletedAt) return true;
      return new Date(getEntryUpdatedAt(entry)).getTime() > new Date(deletedAt).getTime();
    });

    const lastUpdated = latestIsoDate(
      local.lastUpdated,
      remote.lastUpdated,
      ...entries.map(({ entry }) => getEntryUpdatedAt(entry)),
      ...Object.values(prunedDeletedEntries),
    );

    return {
      data: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        months: buildMonths(entries),
        deletedEntries: prunedDeletedEntries,
        lastUpdated,
      },
      conflicts,
    };
  },

  mergeTimelineData(local: ExportData, remote: ExportData): ExportData {
    return dataService.mergeTimelineDataDetailed(local, remote).data;
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
