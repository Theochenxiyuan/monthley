import { defineStore } from "pinia";
import { useDark } from "@vueuse/core";
import i18n from "@/i18n";
import { isValidSyncKey } from "@/utils/syncKey";

const supportedLanguages = ["zh-CN", "en-US"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedLanguage(value: unknown): value is (typeof supportedLanguages)[number] {
  return (
    typeof value === "string" &&
    supportedLanguages.includes(value as (typeof supportedLanguages)[number])
  );
}

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    isDark: useDark(),
    language: "zh-CN",
    expandAll: false,
    autoSchedulePrompt: "",
    syncKey: null as string | null,
  }),

  actions: {
    init() {
      this.$subscribe((_, state) => {
        localStorage.setItem("settings", JSON.stringify(state));
        document.documentElement.classList.toggle("dark", state.isDark);
      });
      const saved = localStorage.getItem("settings");
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          if (!isRecord(settings)) return;

          this.isDark = typeof settings.isDark === "boolean" ? settings.isDark : this.isDark;
          this.language = isSupportedLanguage(settings.language) ? settings.language : "zh-CN";
          this.expandAll = typeof settings.expandAll === "boolean" ? settings.expandAll : false;
          this.autoSchedulePrompt = typeof settings.autoSchedulePrompt === "string" ? settings.autoSchedulePrompt : "";
          this.syncKey = isValidSyncKey(settings.syncKey) ? settings.syncKey : null;
        } catch (err) {
          console.error("Error loading settings:", err);
        }
      }
      document.documentElement.classList.toggle("dark", this.isDark);
      i18n.global.locale.value = this.language as "zh-CN" | "en-US";
    },
    setLanguage(lang: string) {
      this.language = lang;
      i18n.global.locale.value = lang as "zh-CN" | "en-US";
    },
    toggleDark() {
      this.isDark = !this.isDark;
    },
  },
});
