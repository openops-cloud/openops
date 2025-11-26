/* eslint-disable @typescript-eslint/no-explicit-any */

import { ApplicationError } from '@openops/shared';

export const maxFieldLength = 2048;

const REDACTED = '[REDACTED]';

const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'oldPassword',
  'currentPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'privateKey',
  'authorization',
  'cookie',
  'sessionId',
  'passphrase',
];

const SENSITIVE_FIELD_PATTERNS = SENSITIVE_FIELDS.map(
  (field) => new RegExp(`"${field}"\\s*:\\s*"[^"]*"`, 'gi'),
);

const isSensitiveField = (key: string): boolean => {
  return SENSITIVE_FIELDS.includes(key.toLowerCase());
};

const redactSensitiveFields = (obj: any, visited = new WeakSet()): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (visited.has(obj)) {
    return '[Circular]';
  }

  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveFields(item, visited));
  }

  const redacted: any = {};
  for (const key in obj) {
    if (isSensitiveField(key)) {
      redacted[key] = REDACTED;
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      redacted[key] = redactSensitiveFields(obj[key], visited);
    } else {
      redacted[key] = obj[key];
    }
  }
  return redacted;
};

const redactSensitiveDataInString = (
  value: string | undefined,
): string | undefined => {
  if (!value) {
    return value;
  }
  let result = value;
  SENSITIVE_FIELDS.forEach((field, index) => {
    result = result.replace(
      SENSITIVE_FIELD_PATTERNS[index],
      `"${field}":"${REDACTED}"`,
    );
  });
  return result;
};

export const truncate = (
  value: string | undefined,
  maxLength: number = maxFieldLength,
) => {
  return value && value.length > maxLength
    ? `${value.substring(0, maxLength - 3)}...`
    : value;
};

export const cleanLogEvent = (logEvent: any) => {
  if (logEvent.message) {
    logEvent.message = redactSensitiveDataInString(truncate(logEvent.message));
  }

  if (!logEvent.event) {
    return logEvent;
  }

  const eventData: any = {};

  if (logEvent.event instanceof Error) {
    logEvent.event = { error: logEvent.event };
  }

  for (const key in logEvent.event) {
    const value = logEvent.event[key];
    if (value === null || value === undefined) {
      continue;
    }

    if (isSensitiveField(key)) {
      eventData[key] = REDACTED;
    } else if (key === 'res' && value && value.raw) {
      extractRequestFields(value, eventData, logEvent);
    } else if (value instanceof Error) {
      extractErrorFields(key, value, eventData, logEvent);
    } else if (typeof value === 'number') {
      eventData[key] = Math.round(value * 100) / 100;
    } else if (typeof value === 'object') {
      eventData[key] = stringify(redactSensitiveFields(value));
    } else if (typeof value === 'string') {
      eventData[key] = redactSensitiveDataInString(truncate(value));
    } else {
      eventData[key] = truncate(value);
    }
  }

  logEvent.event = eventData;
  return logEvent;
};

function extractRequestFields(value: any, eventData: any, logEvent: any) {
  const rawResponse = value.raw;
  eventData.requestMethod = rawResponse.req.method;
  eventData.requestPath = truncate(rawResponse.req.url);
  eventData.statusCode = rawResponse.statusCode;
  const responseTime = parseFloat(logEvent.event.responseTime);

  if (!isNaN(responseTime)) {
    eventData.responseTime = responseTime.toFixed();
  }

  logEvent['message'] = `Request completed [${eventData.requestMethod} ${
    eventData.requestPath
  } ${eventData.statusCode} ${eventData.responseTime ?? 0}ms]`;
  logEvent['level'] = 'debug';
}

function extractErrorFields(
  key: string,
  value: Error | ApplicationError,
  eventData: any,
  logEvent: any,
) {
  const errorKey = key === 'err' ? 'error' : key;
  const { stack, message, name, ...context } = value;
  eventData[errorKey + 'Stack'] = redactSensitiveDataInString(truncate(stack));
  if (message) {
    eventData[errorKey + 'Message'] = redactSensitiveDataInString(
      truncate(message),
    );
    if (!logEvent.message) {
      logEvent.message = redactSensitiveDataInString(truncate(message));
    }
  }
  eventData[errorKey + 'Name'] = truncate(name);
  if (value instanceof ApplicationError) {
    eventData[errorKey + 'Code'] = truncate(value.error.code);
    eventData[errorKey + 'Params'] = stringify(
      redactSensitiveFields(value.error.params),
    );
  } else if (Object.keys(context).length) {
    eventData[errorKey + 'Context'] = stringify(redactSensitiveFields(context));
  }
}

function stringify(value: any) {
  return truncate(JSON.stringify(value));
}
