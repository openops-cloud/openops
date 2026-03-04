import {
  getTableIdByTableName,
  makeOpenOpsAnalyticsPostFormData,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import FormData from 'form-data';
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';

function getDashboardFolderPath(providerKey: string): string {
  return path.join(
    process.cwd(),
    'packages',
    'server',
    'api',
    'src',
    'assets',
    `${providerKey.toLowerCase()}-benchmark-dashboard`,
  );
}

function addFolderToZip(folderPath: string, zipFolder: JSZip): void {
  const entries = fs.readdirSync(folderPath);
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const subFolder = zipFolder.folder(entry);
      if (subFolder) {
        addFolderToZip(fullPath, subFolder);
      }
    } else {
      zipFolder.file(entry, fs.readFileSync(fullPath));
    }
  }
}

// Superset's remove_root() strips the first directory level from all zip paths,
// so files must be wrapped in a root folder to preserve their expected prefixes
// (e.g. databases/, datasets/, charts/, dashboards/).
export async function createDashboardZipBuffer(
  providerKey: string,
): Promise<Buffer> {
  const zip = new JSZip();
  const rootFolder = zip.folder(`${providerKey}-benchmark-dashboard`);
  if (!rootFolder) {
    throw new Error('Failed to create root folder in zip');
  }
  addFolderToZip(getDashboardFolderPath(providerKey), rootFolder);
  return zip.generateAsync({ type: 'nodebuffer' });
}

export async function importDashboardFromZip(
  token: string,
  zipBuffer: Buffer,
  databaseUuid: string,
  datasetMapping: Record<string, string>,
): Promise<void> {
  const formData = new FormData();

  formData.append('formData', zipBuffer, {
    filename: 'dashboard.zip',
    contentType: 'application/zip',
  });

  formData.append('overwrite', 'true');

  const databaseMapping = {
    openops_tables_connection: databaseUuid,
  };
  formData.append('database_mapping', JSON.stringify(databaseMapping));
  formData.append('dataset_mapping', JSON.stringify(datasetMapping));

  logger.info('Sending dashboard import request', {
    databaseMapping,
    datasetMapping,
  });

  try {
    await makeOpenOpsAnalyticsPostFormData(
      'dashboard/import/',
      token,
      formData,
    );
  } catch (error) {
    logger.error('Failed to import benchmark dashboard from zip', {
      databaseMapping,
      datasetMapping,
      error,
    });
    throw error;
  }

  logger.info('Successfully imported dashboard');
}

export async function resolveTableIds(
  project: {
    tablesDatabaseId: number;
    tablesDatabaseToken: { iv: string; data: string };
  },
  tableNames: string[],
): Promise<Record<string, number>> {
  try {
    const entries = await Promise.all(
      tableNames.map(async (name) => {
        const id = await getTableIdByTableName(name, {
          tablesDatabaseId: project.tablesDatabaseId,
          tablesDatabaseToken: project.tablesDatabaseToken,
        });
        return [name, id] as const;
      }),
    );
    return Object.fromEntries(entries);
  } catch (error) {
    logger.error(
      'Could not resolve required table IDs for benchmark dashboard',
      { tableNames, error },
    );
    throw error;
  }
}
