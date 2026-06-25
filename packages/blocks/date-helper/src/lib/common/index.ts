import dayjs from 'dayjs';

export interface dateInformation {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  unix_time: number;
}

export enum timeFormat {
  format00 = 'DDD MMM DD YYYY HH:mm:ss',
  format01 = 'DDD MMM DD HH:mm:ss YYYY',
  format02 = 'MMMM DD YYYY HH:mm:ss',
  format03 = 'MMMM DD YYYY',
  format04 = 'MMM DD YYYY',
  format05 = 'YYYY-MM-DDTHH:mm:ss',
  format06 = 'YYYY-MM-DD HH:mm:ss',
  format07 = 'YYYY-MM-DD',
  format08 = 'MM-DD-YYYY',
  format09 = 'MM/DD/YYYY',
  format10 = 'MM/DD/YY',
  format11 = 'DD-MM-YYYY',
  format12 = 'DD/MM/YYYY',
  format13 = 'DD/MM/YY',
  format14 = 'X',
  format15 = 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  format16 = 'YYYYMMDD',
}

export enum timeFormatLabel {
  format00 = 'DDD MMM DD YYYY HH:mm:ss (Sun Sep 17 2023 11:23:58)',
  format01 = 'DDD MMM DD HH:mm:ss YYYY (Sun Sep 17 11:23:58 2023)',
  format02 = 'MMMM DD YYYY HH:mm:ss (September 17 2023 11:23:58)',
  format03 = 'MMMM DD YYYY (September 17 2023)',
  format04 = 'MMM DD YYYY (Sep 17 2023)',
  format05 = 'YYYY-MM-DDTHH:mm:ss (2023-09-17T11:23:58)',
  format06 = 'YYYY-MM-DD HH:mm:ss (2023-09-17 11:23:58)',
  format07 = 'YYYY-MM-DD (2023-09-17)',
  format08 = 'MM-DD-YYYY (09-17-2023)',
  format09 = 'MM/DD/YYYY (09/17/2023)',
  format10 = 'MM/DD/YY (09/17/23)',
  format11 = 'DD-MM-YYYY (17-09-2023)',
  format12 = 'DD/MM/YYYY (17/09/2023)',
  format13 = 'DD/MM/YY (17/09/23)',
  format14 = 'X (1694949838)',
  format15 = 'YYYY-MM-DDTHH:mm:ss.SSSZ (2023-09-17T11:23:58.000Z)',
  format16 = 'YYYYMMDD (20230917)',
}

export enum timeParts {
  year = 'year',
  month = 'month',
  day = 'day',
  hour = 'hour',
  minute = 'minute',
  second = 'second',
  unix_time = 'unix_time',
  dayOfWeek = 'dayOfWeek',
  monthName = 'monthName',
}

export const timeFormatDescription = `Here's what each part of the format (eg. YYYY) means:
\nYYYY : Year (4 digits)
\nYY : Year (2 digits)
\nMMMM : Month (full name)
\nMMM : Month (short name)
\nMM : Month (2 digits)
\nDDDD : Day (full name)
\nDDD : Day (short name)
\nDD : Day (2 digits)
\nHH : Hour (2 digits)
\nmm : Minute (2 digits)
\nss : Second (2 digits)
\nX : Time in unix format`;

export const optionalTimeFormats = [
  { label: timeFormatLabel.format07, value: timeFormat.format07 },
  { label: timeFormatLabel.format06, value: timeFormat.format06 },
  { label: timeFormatLabel.format05, value: timeFormat.format05 },
  { label: timeFormatLabel.format15, value: timeFormat.format15 },
  { label: timeFormatLabel.format00, value: timeFormat.format00 },
  { label: timeFormatLabel.format01, value: timeFormat.format01 },
  { label: timeFormatLabel.format02, value: timeFormat.format02 },
  { label: timeFormatLabel.format03, value: timeFormat.format03 },
  { label: timeFormatLabel.format04, value: timeFormat.format04 },
  { label: timeFormatLabel.format08, value: timeFormat.format08 },
  { label: timeFormatLabel.format09, value: timeFormat.format09 },
  { label: timeFormatLabel.format10, value: timeFormat.format10 },
  { label: timeFormatLabel.format11, value: timeFormat.format11 },
  { label: timeFormatLabel.format12, value: timeFormat.format12 },
  { label: timeFormatLabel.format13, value: timeFormat.format13 },
  { label: timeFormatLabel.format16, value: timeFormat.format16 },
  { label: timeFormatLabel.format14, value: timeFormat.format14 },
];

function formatNumber(num: number, length: number) {
  let result = num.toString();
  while (result.length < length) result = '0' + result;
  return result;
}

function getYear(dateString: string, typeString: string) {
  let yearIndex = typeString.indexOf('YYYY'),
    year = 0;
  if (yearIndex !== -1) {
    const stringYear = dateString.substring(yearIndex, yearIndex + 4);
    year = parseInt(stringYear);
    if (Number.isNaN(year)) {
      throw new Error(
        `Invalid Date format in ${typeString}. The value "${stringYear}" for "YYYY" cannot be parsed as an integer.`,
      );
    }
  } else {
    yearIndex = typeString.indexOf('YY');
    if (yearIndex !== -1) {
      const stringYear = dateString.substring(yearIndex, yearIndex + 2);
      year = parseInt(stringYear);
      if (Number.isNaN(year)) {
        throw new Error(
          `Invalid Date format in ${typeString}. The value "${stringYear}" for "YY" cannot be parsed as an integer.`,
        );
      }
      year = year + 2000;
    }
  }
  return year;
}

function getMonth(dateString: string, typeString: string) {
  let monthIndex = typeString.indexOf('MMMM'),
    month = 0;
  if (monthIndex !== -1) {
    const monthNames1 = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    for (let i = 0; i < monthNames1.length; i++) {
      if (dateString.toLowerCase().includes(monthNames1[i].toLowerCase())) {
        month = i + 1;
        break;
      }
    }
    if (month == 0)
      throw new Error(
        `Invalid Date format in ${typeString}. The value for "MMMM" which is long month cannot be found in ${dateString}.`,
      );
  } else {
    monthIndex = typeString.indexOf('MMM');
    if (monthIndex !== -1) {
      const monthNames2 = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      for (let i = 0; i < monthNames2.length; i++) {
        if (dateString.toLowerCase().includes(monthNames2[i].toLowerCase())) {
          month = i + 1;
          break;
        }
      }
      if (month == 0)
        throw new Error(
          `Invalid Date format in ${typeString}. The value for "MMM" which is short month cannot be found in ${dateString}.`,
        );
    } else {
      monthIndex = typeString.indexOf('MM');
      if (monthIndex !== -1) {
        const monthString = dateString.substring(monthIndex, monthIndex + 2);
        month = parseInt(monthString);
        if (Number.isNaN(month))
          throw new Error(
            `Invalid Date format in ${typeString}. The value "${monthString}" for "MM" cannot be parsed as an integer.`,
          );
      }
    }
  }
  return month;
}

function getDay(dateString: string, typeString: string) {
  const dayIndex = typeString.indexOf('DD');
  let day = 0;
  if (dayIndex !== -1) {
    const stringDay = dateString.substring(dayIndex, dayIndex + 2);
    day = parseInt(stringDay);
    if (Number.isNaN(day))
      throw new Error(
        `Invalid Date format in ${typeString}. The value "${stringDay}" for "DD" cannot be parsed as an integer.`,
      );
  }
  return day;
}

function getHour(dateString: string, typeString: string) {
  const hourIndex = typeString.indexOf('HH');
  let hour = 0;
  if (hourIndex !== -1) {
    const stringHour = dateString.substring(hourIndex, hourIndex + 2);
    hour = parseInt(stringHour);
    if (Number.isNaN(hour))
      throw new Error(
        `Invalid Date format in ${typeString}. The value "${stringHour}" for "HH" cannot be parsed as an integer.`,
      );
  }
  return hour;
}

function getMinute(dateString: string, typeString: string) {
  const minuteIndex = typeString.indexOf('mm');
  let minute = 0;
  if (minuteIndex !== -1) {
    const stringMinute = dateString.substring(minuteIndex, minuteIndex + 2);
    minute = parseInt(stringMinute);
    if (Number.isNaN(minute))
      throw new Error(
        `Invalid Date format in ${typeString}. The value "${stringMinute}" for "mm" cannot be parsed as an integer.`,
      );
  }
  return minute;
}

function getSecond(dateString: string, typeString: string) {
  const secondIndex = typeString.indexOf('ss');
  let second = 0;
  if (secondIndex !== -1) {
    const stringSecond = dateString.substring(secondIndex, secondIndex + 2);
    second = parseInt(stringSecond);
    if (Number.isNaN(second))
      throw new Error(
        `Invalid Date format in ${typeString}. The value "${stringSecond}" for "ss" cannot be parsed as an integer.`,
      );
  }
  return second;
}

function removeMonth(date: string) {
  const longMonthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const shortMonthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  for (let i = 0; i < longMonthNames.length; i++) {
    date = date.replace(longMonthNames[i], '');
  }
  for (let i = 0; i < shortMonthNames.length; i++) {
    date = date.replace(shortMonthNames[i], '');
  }
  return date;
}

function removeDay(date: string) {
  const longDayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < longDayNames.length; i++) {
    date = date.replace(longDayNames[i], '');
  }
  for (let i = 0; i < shortDayNames.length; i++) {
    date = date.replace(shortDayNames[i], '');
  }
  return date;
}

export function createDateFromInfo(dateInfo: dateInformation) {
  let date;
  if (dateInfo.unix_time !== 0) date = new Date(dateInfo.unix_time);
  else
    date = new Date(
      dateInfo.year,
      dateInfo.month - 1,
      dateInfo.day,
      dateInfo.hour,
      dateInfo.minute,
      dateInfo.second,
    );
  return date;
}

export function getDateInformation(date: string, TF: string) {
  if (TF === timeFormat.format14) {
    const d = new Date(parseInt(date));

    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
      unix_time: parseInt(date),
    };
  }

  let typeString = TF.toString();
  // first we strip the month names and day names from the date string
  const month = getMonth(date, typeString);

  date = removeMonth(date);
  typeString = typeString
    .replace('MMMM', '')
    .replace('MMM', '')
    .replace('DDDD', '')
    .replace('DDD', '');
  date = removeDay(date);

  const day = getDay(date, typeString);
  const year = getYear(date, typeString);
  const hour = getHour(date, typeString);
  const minute = getMinute(date, typeString);
  const second = getSecond(date, typeString);

  return {
    year: year,
    month: month,
    day: day,
    hour: hour,
    minute: minute,
    second: second,
    unix_time: new Date(year, month - 1, day, hour, minute, second).getTime(),
  };
}

export function createNewDate(date: Date, TF: string) {
  const year = formatNumber(date.getFullYear(), 4);
  const result = TF.replace('YYYY', year)
    .replace('YY', year.substring(2, 4))
    .replace('MMMM', date.toLocaleString('default', { month: 'long' }))
    .replace('MMM', date.toLocaleString('default', { month: 'short' }))
    .replace('MM', formatNumber(date.getMonth() + 1, 2))
    .replace('DDDD', date.toLocaleString('default', { weekday: 'long' }))
    .replace('DDD', date.toLocaleString('default', { weekday: 'short' }))
    .replace('DD', formatNumber(date.getDate(), 2))
    .replace('HH', formatNumber(date.getHours(), 2))
    .replace('mm', formatNumber(date.getMinutes(), 2))
    .replace('ss', formatNumber(date.getSeconds(), 2))
    .replace('X', date.getTime().toString());
  return result;
}

export function timeDiff(beforeTimeZone: string, afterTimeZone: string) {
  const date = new Date();
  const BeforeDate = new Date(
    date.toLocaleString('en-US', { timeZone: beforeTimeZone }),
  );
  const AfterDate = new Date(
    date.toLocaleString('en-US', { timeZone: afterTimeZone }),
  );
  const diff = (AfterDate.getTime() - BeforeDate.getTime()) / 60000;

  return diff;
}

export function ChangeDateFormat(
  date: string,
  beforeFormat: string,
  beforeTimeZone: string,
  afterFormat: string,
  afterTimeZone: string,
) {
  const DateInfo = getDateInformation(date, beforeFormat) as dateInformation;
  const BeforeDate = createDateFromInfo(DateInfo);
  BeforeDate.setMinutes(
    BeforeDate.getMinutes() + timeDiff(beforeTimeZone, afterTimeZone),
  );
  const newDate = createNewDate(BeforeDate, afterFormat);

  return newDate;
}

export function addSubtractTime(date: Date, expression: string) {
  let dayjsDate = dayjs(date);
  // remove all the spaces and line breaks from the expression
  expression = expression.replace(/(\r\n|\n|\r)/gm, '').replace(/ /g, '');
  const parts = expression.split(/(\+|-)/);
  let sign = 1;
  const numbers = [];
  const units = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '+') sign = 1;
    else if (parts[i] === '-') sign = -1;
    else if (parts[i] === '') continue;
    let number = '';
    let unit = '';
    for (let j = 0; j < parts[i].length; j++) {
      if (parts[i][j] === ' ') continue;
      if (parts[i][j] >= '0' && parts[i][j] <= '9') {
        if (unit !== '') {
          numbers.push(sign * parseInt(number));
          units.push(unit);
          number = '';
          unit = '';
        }
        number += parts[i][j];
      } else {
        if (number === '') continue;
        unit += parts[i][j];
      }
    }
    if (unit !== '') {
      numbers.push(sign * parseInt(number));
      units.push(unit);
    }
  }

  const validUnits = new Set([
    'year',
    'month',
    'day',
    'hour',
    'minute',
    'second',
  ]);

  for (let i = 0; i < numbers.length; i++) {
    const value = numbers[i];
    const unit = units[i].toLowerCase();

    if (validUnits.has(unit)) {
      const manipulateUnit = unit as dayjs.ManipulateType;
      if (value > 0) {
        dayjsDate = dayjsDate.add(value, manipulateUnit);
      } else if (value < 0) {
        dayjsDate = dayjsDate.subtract(Math.abs(value), manipulateUnit);
      }
    }
  }

  return dayjsDate.toDate();
}

export { timezoneOptions as timeZoneOptions } from '@openops/shared';
