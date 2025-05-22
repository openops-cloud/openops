/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-dynamic-delete */
export const maxFieldLength = 2048;

export const truncate = (value: string, maxLength: number = maxFieldLength) => {
  return value.length > maxLength
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

  for (const key in logEvent.event) {
    const value = logEvent.event[key];
    if (value === null || value === undefined) {
      continue;
    }

    delete eventData[key];

    if (key == 'res' && value && value.raw) {
      const rawResponse = value.raw;
      eventData.requestMethod = rawResponse.req.method;
      eventData.requestPath = truncate(rawResponse.req.url);
      eventData.statusCode = rawResponse.statusCode;
      const responseTime = parseFloat(logEvent.event.responseTime).toFixed();
      eventData.responseTime = responseTime;
      logEvent[
        'message'
      ] = `Request completed [${eventData.requestMethod} ${eventData.requestPath} ${eventData.statusCode} ${responseTime}ms]`;
      logEvent['level'] = 'debug';
      continue;
    }

    if (typeof value === 'object') {
      try {
        eventData[key] = truncate(JSON.stringify(value));
      } catch (error) {
        eventData[key] = `Logger error - could not stringify object. ${error}`;
      }
      continue;
    }

    if (typeof value === 'number') {
      // Max 2 decimal points
      eventData[key] = Math.round(value * 100) / 100;
      continue;
    }

    eventData[key] = truncate(value);
  }

  if (logEvent.event instanceof Error) {
    eventData.stack = truncate(logEvent.event.stack, 2000);
    eventData.name = logEvent.event.name;
    if (!logEvent.message) {
      logEvent.message = truncate(logEvent.event.message);
    } else {
      eventData.message = truncate(logEvent.event.message);
    }
  }
  logEvent.event = eventData;
  return logEvent;
};
