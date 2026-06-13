import { defineStore } from "pinia";

export const useStatsStore = defineStore("stats", {
  state: () => ({
    selectedYear: null as number | null,
  }),

  actions: {
    init(initialYear: number) {
      if (this.selectedYear === null) {
        this.selectedYear = initialYear;
      }
    },
  },
});
