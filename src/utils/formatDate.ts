import {
  format,
  parseISO,
  isValid,
  isThisMonth,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 安全解析日期
const safeParse = (date: Date | string): Date => {
  if (date instanceof Date) return date;
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : new Date(); // 无效时返回当前日期
};

// 月份格式化
export const formatMonthToChinese = (date: Date | string): string => {
  return format(safeParse(date), 'yyyy年M月', { locale: zhCN });
};

// 判断是否当前月
export const isCurrentMonth = (date: Date | string): boolean => {
  return isThisMonth(safeParse(date));
};

export const formatYearMonth = (yearMonth: {
  year: number;
  month: number;
}): string => {
  return `${yearMonth.year}-${yearMonth.month < 10 ? '0' : ''}${
    yearMonth.month
  }`;
};

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

  if (seconds < 60) return `${seconds}秒前`;
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;

  // 日期部分格式化
  const dateStr = format(dateObj, 'yyyy年M月d日', { locale: zhCN });

  if (days === 0) return `今天 ${timeStr}`;
  if (days === 1) return `昨天 ${timeStr}`;
  if (days === 2) return `前天 ${timeStr}`;
  return `${dateStr} ${timeStr}`;
};
