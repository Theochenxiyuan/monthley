import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

const getInitialLocale = (): string => {
  const savedLanguage = localStorage.getItem('settings');
  if (savedLanguage) {
    try {
      const settings = JSON.parse(savedLanguage);
      if (
        settings.language &&
        messages[settings.language as keyof typeof messages]
      ) {
        return settings.language;
      }
    } catch (e) {
      console.error('Failed to parse saved language settings:', e);
    }
  }

  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
};

const i18n = createI18n({
  locale: getInitialLocale(),
  fallbackLocale: 'en-US',
  messages,
});

export default i18n;
