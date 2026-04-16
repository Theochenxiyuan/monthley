import type { TimelineState, TimelineMonth } from '@/types/models';

const STORAGE_KEY = 'timeline';

export interface ExportData {
  months: TimelineMonth[];
  lastUpdated: string | null;
}

export const dataService = {
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
          
          if (!json.months || !Array.isArray(json.months)) {
            throw new Error('Invalid timeline data format');
          }

          const validatedData: ExportData = {
            months: json.months.map((month: any) => ({
              year: month.year,
              month: month.month,
              entries: month.entries || [],
            })),
            lastUpdated: json.lastUpdated || null,
          };

          resolve(validatedData);
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
          existingMonth.entries.push(...importedMonth.entries);
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
