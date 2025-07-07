import { defineStore } from 'pinia';
import { useDark, useToggle } from '@vueuse/core';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    isDark: useDark(),
    language: 'zh-CN',
    syncInterval: 30, // 分钟
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
      }
      document.documentElement.classList.toggle('dark', this.isDark);
    },
  },
});
