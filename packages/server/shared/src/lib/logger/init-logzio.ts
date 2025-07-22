/* eslint-disable no-console */
import { createLogger, ILogzioLogger } from 'logzio-nodejs';
import { SharedSystemProp, system } from '../system';

export const initLogzioLogger = (): ILogzioLogger | undefined => {
  try {
    const logzioToken = system.get<string>(SharedSystemProp.LOGZIO_TOKEN) ?? '';

    if (logzioToken) {
      const environmentName =
        system.get<string>(SharedSystemProp.ENVIRONMENT_NAME) ?? 'local';
      const component = system.get<string>(SharedSystemProp.COMPONENT) ?? '';
      const version = system.get<string>(SharedSystemProp.VERSION);

      return createLogger({
        token: logzioToken,
        protocol: 'https',
        host: 'listener.logz.io',
        port: '8071',
        type: 'pino',
        extraFields: {
          environment: environmentName,
          component,
          version,
        },
        addOtelContext: false,
      });
    }
  } catch (e) {
    console.error('Something happened while initializing logzio.', e);
  }

  return undefined;
};
