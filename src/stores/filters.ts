import type { EntryStatus, EntryType } from '@/types/models';
import { entryStatuses, entryTypes } from '@/types/models';
import { defineStore } from 'pinia';

export const useFiltersStore = defineStore('filters', {
  state: () => ({
    activeFilters: {
      type: [] as EntryType[],
      status: [] as EntryStatus[],
    },
  }),
  getters: {
    isTypeFilterActive(): boolean {
      return this.activeFilters.type.length !== 0;
    },
    isStatusFilterActive(): boolean {
      return this.activeFilters.status.length !== 0;
    },
    isActive(): boolean {
      return this.isTypeFilterActive || this.isStatusFilterActive;
    },
  },
  actions: {
    resetFilters() {
      // Reset to show everything
      this.activeFilters.type = [];
      this.activeFilters.status = [];
    },
  },
});
