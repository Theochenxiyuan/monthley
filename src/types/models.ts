// export type EntryType = 'learn' | 'play' | 'watch' | 'read';
export type EntryStatus = 'not_started' | 'in_progress' | 'completed';

export interface TimelineEntry {
  id: string; // 唯一标识
  name: string;
  type: string;
  status: EntryStatus;
  orderIndex: number;
  notes?: string; // 可选备注
}

// 月份数据
export interface TimelineMonth {
  year: number;
  month: number; // 1-12
  entries: TimelineEntry[];
}

// 时间线状态（Pinia Store 类型）
export interface TimelineState {
  months: TimelineMonth[];
  lastSynced: Date | null;
}

export interface EntryFormData {
  name: string;
  type: string;
  status: EntryStatus;
  month: Date;
  notes?: string;
}

export interface FilterState {
  showTypes: string[];
  showStatuses: EntryStatus[];
}
export interface SettingsState {
  syncKey: string | null;
  settings: {};
}
