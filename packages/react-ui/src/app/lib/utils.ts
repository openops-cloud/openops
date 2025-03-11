import { AxiosError } from 'axios';
import { isValid, parseISO } from 'date-fns';
import dayjs from 'dayjs';

const EMAIL_REGEX =
  '^[a-zA-Z0-9_.+]+(?<!^[0-9]*)@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$';

export const formatUtils = {
  EMAIL_REGEX,
  formatStepInputOrOutput(sampleData: unknown) {
    const cleanedSampleData =
      typeof sampleData === 'object'
        ? JSON.parse(JSON.stringify(sampleData))
        : sampleData;
    return cleanedSampleData;
  },

  convertEnumToHumanReadable(str: string) {
    const words = str.split('_');
    return words
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLocaleLowerCase(),
      )
      .join(' ');
  },
  formatNumber(number: number) {
    return new Intl.NumberFormat('en-US').format(number);
  },
  formatDate(date: Date) {
    const now = dayjs();
    const inputDate = dayjs(date);

    const isToday = inputDate.isSame(now, 'day');
    const isYesterday = inputDate.isSame(now.subtract(1, 'day'), 'day');

    const timeFormat = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });

    if (isToday) {
      return `Today at ${timeFormat.format(date)}`;
    } else if (isYesterday) {
      return `Yesterday at ${timeFormat.format(date)}`;
    } else {
      return Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(date);
    }
  },
  formatDuration(durationMs: number | undefined, short?: boolean): string {
    if (durationMs === undefined) {
      return '-';
    }
    if (durationMs < 1000) {
      const durationMsFormatted = Math.floor(durationMs);
      return short
        ? `${durationMsFormatted} ms`
        : `${durationMsFormatted} milliseconds`;
    }
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) {
      return short ? `${seconds} s` : `${seconds} seconds`;
    }

    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return short
        ? `${minutes} min ${
            remainingSeconds > 0 ? `${remainingSeconds} s` : ''
          }`
        : `${minutes} minutes${
            remainingSeconds > 0 ? ` ${remainingSeconds} seconds` : ''
          }`;
    }

    return short ? `${seconds} s` : `${seconds} seconds`;
  },
};

export const validationUtils = {
  isValidationError: (
    error: unknown,
  ): error is AxiosError<{ code?: string; params?: { message?: string } }> => {
    console.error('isValidationError', error);
    return (
      error instanceof AxiosError &&
      error.response?.status === 409 &&
      error.response?.data?.code === 'VALIDATION'
    );
  },
};

export const isStepFileUrl = (json: unknown): json is string => {
  return (
    Boolean(json) &&
    typeof json === 'string' &&
    (json.includes('/api/v1/step-files/') || json.includes('file://'))
  );
};

export const isValidISODate = (dateString: string) => {
  const parsedDate = parseISO(dateString);
  return isValid(parsedDate);
};
