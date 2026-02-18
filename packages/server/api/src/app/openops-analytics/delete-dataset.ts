import {
  createAxiosHeadersForAnalytics,
  makeOpenOpsAnalyticsDelete,
} from '@openops/common';
import { logger } from '@openops/server-shared';

export async function deleteDataset(
  token: string,
  datasetId: number,
): Promise<void> {
  try {
    await makeOpenOpsAnalyticsDelete(
      `dataset/${datasetId}`,
      createAxiosHeadersForAnalytics(token),
      false,
    );
    logger.info(`Deleted dataset with ID: ${datasetId}`);
  } catch (error) {
    logger.warn(`Failed to delete dataset ${datasetId}, continuing anyway`, {
      error,
    });
  }
}
