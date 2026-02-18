import { makeOpenOpsAnalyticsDelete } from '@openops/common';
import { logger } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';

export async function deleteDataset(
  authenticationHeader: AxiosHeaders,
  datasetId: number,
): Promise<void> {
  try {
    await makeOpenOpsAnalyticsDelete(
      `dataset/${datasetId}`,
      authenticationHeader,
      false,
    );
    logger.info(`Deleted dataset with ID: ${datasetId}`);
  } catch (error) {
    logger.warn(`Failed to delete dataset ${datasetId}, continuing anyway`, {
      error,
    });
  }
}
