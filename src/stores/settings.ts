import { defineStore } from 'pinia';
import { useDark, useToggle } from '@vueuse/core';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    isDark: useDark(),
    language: 'zh-CN',
    expandAll: false,
    showEntriesCollapsed: false,
    showNumCollapsed: true,
  }),

  actions: {
    init() {
      this.$subscribe((_, state) => {
        localStorage.setItem('settings', JSON.stringify(state));
      });
      const saved = localStorage.getItem('settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.isDark = settings.isDark;
        this.language = settings.language || 'zh-CN';
        this.expandAll = settings.expandAll;
        this.showEntriesCollapsed = settings.showEntriesCollapsed;
        this.showNumCollapsed = settings.showNumCollapsed;
      }
      document.documentElement.classList.toggle('dark', this.isDark);
    },
  },
});
