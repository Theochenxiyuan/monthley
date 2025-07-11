export const entryTypes = ['learn', 'play', 'watch', 'read'] as const;
export const entryStatuses = [
  'not_started',
  'in_progress',
  'completed',
] as const;

export type EntryType = (typeof entryTypes)[number];

export type EntryStatus = (typeof entryStatuses)[number];

export const statusMap = {
  not_started: '准备',
  in_progress: '正在',
  completed: '已',
} as const;

export const typeMap = {
  learn: '学',
  play: '玩',
  watch: '看',
  read: '读',
} as const;

export interface TimelineEntry {
  id: string; // 唯一标识
  name: string;
  type: EntryType;
  status: EntryStatus;
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
  lastUpdated: Date | null;
}

export interface EntryFormData {
  name: string;
  type: EntryType | '';
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
