/* eslint-disable no-console */
import { requestContext } from '@fastify/request-context';
import { isEmpty } from '@openops/shared';
import pino, { Level, Logger, TransportSingleOptions } from 'pino';
import { SharedSystemProp, system } from '../system';
import { getContext } from './async-context';
import { initLogzioLogger } from './init-logzio';
import { cleanLogEvent, truncate } from './log-cleaner';

function isError(obj: unknown): obj is Error {
  return obj instanceof Error;
}

function initLogger(): Logger {
  try {
    const level = system.get<Level>(SharedSystemProp.LOG_LEVEL) ?? 'info';
    const numericLevel = pino.levels.values[level] ?? 30;
    const pretty = system.getBoolean(SharedSystemProp.LOG_PRETTY) ?? false;

    let transport: TransportSingleOptions | undefined = undefined;
    if (pretty) {
      console.log("Today's logger: Pretty");
      transport = {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          colorize: true,
          ignore: 'pid,hostname,req.raw,res.raw,res.request',
        },
      };
    } else if (logzioLogger) {
      console.log("Today's logger: Logz.io");
    } else {
      console.log("Today's logger: Console JSON");
    }

    // noinspection JSUnusedGlobalSymbols
    const pinoLogger: Logger = pino({
      level,
      transport,
      hooks: {
        logMethod: (inputArgs, method, level) => {
          // Pino expects the context to be first, but we want to support the message being first as well
          if (
            inputArgs.length > 1 &&
            typeof inputArgs[0] === 'string' &&
            typeof inputArgs[1] === 'object'
          ) {
            inputArgs = [inputArgs[1], inputArgs[0], ...inputArgs.slice(2)];
          }
          let eventData: object | undefined =
            typeof inputArgs[0] === 'object' ? inputArgs[0] : undefined;
          if ((eventData && eventData['req']) || level < numericLevel) {
            return null;
          }

          const levelString = pino.levels.labels[level] ?? 'info';
          const message =
            inputArgs && inputArgs.find((arg) => typeof arg === 'string');

          if (isError(eventData) || !isEmpty(eventData)) {
            eventData = enrichEvent(eventData ?? {});
          }

          const logEvent = cleanLogEvent({
            message,
            level: levelString,
            ...(eventData ? { event: eventData } : {}),
          });

          if (logzioLogger) {
            logzioLogger.log(logEvent);
            return null;
          }

          if (!pretty) {
            console.log(JSON.stringify(logEvent));
            return null;
          }

          return method.apply(pinoLogger, [
            logEvent.event,
            logEvent.message,
            ...inputArgs.slice(2),
            method,
            level,
          ]);
        },
      },
    });
    return pinoLogger;
  } catch (error) {
    console.error('Failed to initialize logger', error);
    return pino({ level: 'info' });
  }
}

function enrichEvent(event: object): object {
  const enrichedContext = {
    requestId: requestContext.get('requestId' as never) ?? undefined,
    requestMethod: requestContext.get('requestMethod' as never) ?? undefined,
    requestPath: requestContext.get('requestPath' as never) ?? undefined,
    clientIp: requestContext.get('clientIp' as never) ?? undefined,
    ...getContext(),
  };

  if (event instanceof Error) {
    Object.assign(event, enrichedContext);
    return event;
  }

  return {
    ...event,
    ...enrichedContext,
  };
}

export const logzioLogger = initLogzioLogger();
export const logger = initLogger();
export * from './send-logs';
export { truncate };
