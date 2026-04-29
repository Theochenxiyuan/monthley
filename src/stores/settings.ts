import { defineStore } from 'pinia';
import { useDark, useToggle, useMediaQuery } from '@vueuse/core';
import i18n from '@/i18n';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    isDark: useDark(),
    language: 'zh-CN',
    expandAll: false,
    syncKey: null as string | null,
  }),

  actions: {
    init() {
      this.$subscribe((_, state) => {
        localStorage.setItem('settings', JSON.stringify(state));
        document.documentElement.classList.toggle('dark', state.isDark);
      });
      const saved = localStorage.getItem('settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.isDark = settings.isDark;
        this.language = settings.language || 'zh-CN';
        this.expandAll = settings.expandAll;
        this.syncKey = settings.syncKey || null;
      }
      document.documentElement.classList.toggle('dark', this.isDark);
      i18n.global.locale.value = this.language as 'zh-CN' | 'en-US';
    },
    setLanguage(lang: string) {
      this.language = lang;
      i18n.global.locale.value = lang as 'zh-CN' | 'en-US';
    },
    toggleDark() {
      this.isDark = !this.isDark;
    },
  },
});
