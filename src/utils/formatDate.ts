export function formatMonthToChinese(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    throw new Error('Invalid date input');
  }

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  return `${year}年${month}月`;
}

export function formatDateToChinese(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    throw new Error('Invalid date input');
  }

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();

  return `${year}年${month}月${day}日`;
}

export function smartFormatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // 检查日期是否有效
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    throw new Error('Invalid date input');
  }

  const now = new Date();
  // 修正：使用 getTime() 获取时间戳后再相减
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // 格式化时间为xx:xx:xx
  const formatTime = (): string => {
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const seconds = dateObj.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // 格式化日期为xxxx年x月x日
  const formatDate = (): string => {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    return `${year}年${month}月${day}日`;
  };

  // 相对时间判断
  if (diffInSeconds < 60) {
    return `${diffInSeconds}秒前`;
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  } else if (diffInDays === 0) {
    return `今天 ${formatTime()}`;
  } else if (diffInDays === 1) {
    return `昨天 ${formatTime()}`;
  } else if (diffInDays === 2) {
    return `前天 ${formatTime()}`;
  } else {
    return `${formatDate()} ${formatTime()}`;
  }
}

export function isCurrentMonth(monthYear: {
  month: number;
  year: number;
}): boolean {
  const currentYear = new Date().getFullYear();
  if (currentYear !== monthYear.year) return false;
  const currentMonth = new Date().getMonth() + 1;
  if (currentMonth !== monthYear.month) return false;
  return true;
}
