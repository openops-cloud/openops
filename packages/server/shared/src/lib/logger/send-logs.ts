/* eslint-disable no-console */
import { logzioLogger } from './index';

export async function sendLogs(): Promise<void> {
  await new Promise<void>((resolve, _reject) => {
    try {
      if (logzioLogger) {
        logzioLogger.flush(() => {
          resolve();
        });
      } else {
        resolve();
      }
    } catch (error) {
      console.log('Error sending logs', error);
      resolve();
    }
  });
}
