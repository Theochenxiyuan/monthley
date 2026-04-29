import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import i18n from '@/i18n';

const localeMap = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

const getCurrentLocale = () => {
  const locale = i18n.global.locale.value;
  return localeMap[locale as keyof typeof localeMap] || localeMap['en-US'];
};

export const formatMonth = (ym: { year: number; month: number }): string => {
  const date = new Date(ym.year, ym.month - 1, 1);
  const formatStr = i18n.global.t('date.formats.month');
  return format(date, formatStr, { locale: getCurrentLocale() });
};

export const smartFormatDateTime = (date: Date | string): string => {
  const t = i18n.global.t;
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const locale = getCurrentLocale();
  const isZh = i18n.global.locale.value === 'zh-CN';
  const isThisYear = dateObj.getFullYear() === now.getFullYear();

  if (diffSec < 60) {
    return t('date.secondsAgo', { count: diffSec });
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return t('date.minutesAgo', { count: diffMin });
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return t('date.hoursAgo', { count: diffHours });
  }

  const timeStr = format(dateObj, 'HH:mm');
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    return `${t('date.today')} ${timeStr}`;
  }
  if (diffDays === 1) {
    return `${t('date.yesterday')} ${timeStr}`;
  }
  if (diffDays === 2) {
    return `${t('date.dayBeforeYesterday')} ${timeStr}`;
  }

  if (isThisYear) {
    const dateFmt = isZh ? 'M月d日' : 'MMM d';
    return `${format(dateObj, dateFmt, { locale })} ${timeStr}`;
  }

  const dateFmt = isZh ? 'yyyy年M月d日' : 'MMM d, yyyy';
  return `${format(dateObj, dateFmt, { locale })} ${timeStr}`;
};

export const formatYearMonth = (yearMonth: {
  year: number;
  month: number;
}): string => {
  return `${yearMonth.year}-${yearMonth.month < 10 ? '0' : ''}${yearMonth.month}`;
};

export const isCurrentMonth = (month: {
  year: number;
  month: number;
}): boolean => {
  const now = new Date();
  return now.getFullYear() === month.year && now.getMonth() + 1 === month.month;
};
