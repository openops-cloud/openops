import { ApplicationError } from '@openops/shared';

export const maxFieldLength = 2048;

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
    logEvent.message = truncate(logEvent.message);
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

    if (key == 'res' && value && value.raw) {
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
    } else if (value instanceof Error) {
      const errorKey = key === 'err' ? 'error' : key;
      const { stack, message, name, ...context } = value;
      eventData[errorKey + 'Stack'] = truncate(stack);
      if (message) {
        eventData[errorKey + 'Message'] = truncate(message);
        if (!logEvent.message) {
          logEvent.message = truncate(message);
        }
      }
      eventData[errorKey + 'Name'] = truncate(name);
      if (value instanceof ApplicationError) {
        eventData[errorKey + 'Code'] = truncate(value.error.code);
        eventData[errorKey + 'Params'] = truncate(
          JSON.stringify(value.error.params),
        );
      } else if (context && Object.keys(context).length) {
        eventData[errorKey + 'Context'] = truncate(JSON.stringify(context));
      }
    } else if (typeof value === 'number') {
      // Max 2 decimal points
      eventData[key] = Math.round(value * 100) / 100;
    } else if (typeof value === 'object') {
      try {
        eventData[key] = truncate(JSON.stringify(value));
      } catch (error) {
        eventData[key] = `Logger error - could not stringify object. ${error}`;
      }
    } else {
      eventData[key] = truncate(value);
    }
  }

  logEvent.event = eventData;
  return logEvent;
};
