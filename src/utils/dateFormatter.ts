import {
  format,
  parseISO,
  isValid,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import i18n from '@/i18n';

// 语言对应的locale映射
const localeMap = {
  'zh-CN': zhCN,
  'en-US': enUS,
  // 未来添加新语言时，只需在这里添加映射
};

// 安全解析日期
const safeParse = (date: Date | string): Date => {
  if (date instanceof Date) return date;
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : new Date(); // 无效时返回当前日期
};

// 获取当前语言对应的locale
export const getCurrentLocale = () => {
  const locale = i18n.global.locale;
  return localeMap[locale as keyof typeof localeMap] || localeMap['en-US']; // 默认使用en-US
};

// 月份格式化
export const formatMonth = (date: Date | string): string => {
  try {
    const formatString = i18n.global.t('date.formats.month');
    return format(safeParse(date), formatString, {
      locale: getCurrentLocale(),
    });
  } catch (error) {
    // 降级处理，防止翻译键不存在时出错
    const locale = i18n.global.locale;
    const formatString = locale === 'zh-CN' ? 'yyyy年M月' : 'MMMM yyyy';
    return format(safeParse(date), formatString, {
      locale: getCurrentLocale(),
    });
  }
};

// 智能格式化日期时间
export const smartFormatDateTime = (date: Date | string): string => {
  const dateObj = safeParse(date);
  const now = new Date();

  // 计算时间差
  const seconds = differenceInSeconds(now, dateObj);
  const minutes = differenceInMinutes(now, dateObj);
  const hours = differenceInHours(now, dateObj);
  const days = differenceInDays(now, dateObj);

  // 时间部分格式化
  const timeStr = format(dateObj, 'HH:mm:ss');

  if (seconds < 60) {
    return i18n.global.t('date.secondsAgo', { count: seconds });
  }
  if (minutes < 60) {
    return i18n.global.t('date.minutesAgo', { count: minutes });
  }
  if (hours < 24) {
    return i18n.global.t('date.hoursAgo', { count: hours });
  }

  // 日期部分格式化
  try {
    const dateFormat = i18n.global.t('date.formats.date');
    const dateStr = format(dateObj, dateFormat, { locale: getCurrentLocale() });

    if (days === 0) {
      return `${i18n.global.t('date.today')} ${timeStr}`;
    }
    if (days === 1) {
      return `${i18n.global.t('date.yesterday')} ${timeStr}`;
    }
    if (days === 2) {
      return `${i18n.global.t('date.dayBeforeYesterday')} ${timeStr}`;
    }
    return `${dateStr} ${timeStr}`;
  } catch (error) {
    // 降级处理，防止翻译键不存在时出错
    const locale = i18n.global.locale;
    const dateFormat = locale === 'zh-CN' ? 'yyyy年M月d日' : 'MMMM d, yyyy';
    const dateStr = format(dateObj, dateFormat, { locale: getCurrentLocale() });

    if (days === 0) {
      return locale === 'zh-CN' ? `今天 ${timeStr}` : `Today ${timeStr}`;
    }
    if (days === 1) {
      return locale === 'zh-CN' ? `昨天 ${timeStr}` : `Yesterday ${timeStr}`;
    }
    if (days === 2) {
      return locale === 'zh-CN'
        ? `前天 ${timeStr}`
        : `Day before yesterday ${timeStr}`;
    }
    return `${dateStr} ${timeStr}`;
  }
};

// 格式化年月为字符串（用于内部计算，不直接显示）
export const formatYearMonth = (yearMonth: {
  year: number;
  month: number;
}): string => {
  return `${yearMonth.year}-${yearMonth.month < 10 ? '0' : ''}${yearMonth.month}`;
};

// 判断是否当前月
export const isCurrentMonth = (month: {
  year: number;
  month: number;
}): boolean => {
  const now = new Date();
  return now.getFullYear() === month.year && now.getMonth() + 1 === month.month;
};
