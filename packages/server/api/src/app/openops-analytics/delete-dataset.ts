import { AppSystemProp, logger, system } from '@openops/server-shared';
import axios from 'axios';

export async function deleteDataset(
  token: string,
  datasetId: number,
): Promise<void> {
  const baseUrl =
    system.get(AppSystemProp.ANALYTICS_PRIVATE_URL) + '/openops-analytics';

  try {
    await axios.delete(`${baseUrl}/api/v1/dataset/${datasetId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    logger.info(`Deleted dataset with ID: ${datasetId}`);
  } catch (error) {
    logger.warn(`Failed to delete dataset ${datasetId}, continuing anyway`, {
      error,
    });
  }
}
