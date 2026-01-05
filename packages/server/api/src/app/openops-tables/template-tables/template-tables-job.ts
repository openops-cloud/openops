import { TablesServerContext } from '@openops/common';
import dayjs from 'dayjs';
import { systemJobsSchedule } from '../../helper/system-jobs';
import { SystemJobName } from '../../helper/system-jobs/common';
import { systemJobHandlers } from '../../helper/system-jobs/job-handlers';
import { createAllTemplateTables } from './create-all-template-tables';

export function registerTemplateTablesCreationJobHandler(): void {
  systemJobHandlers.registerJobHandler(
    SystemJobName.CREATE_TEMPLATE_TABLES,
    async (data) => {
      await createAllTemplateTables(data);
    },
  );
}

export async function addTemplateTablesCreationJob({
  tablesDatabaseId,
  tablesDatabaseToken,
}: TablesServerContext): Promise<void> {
  await systemJobsSchedule.upsertJob({
    job: {
      name: SystemJobName.CREATE_TEMPLATE_TABLES,
      data: {
        tablesDatabaseId,
        tablesDatabaseToken,
      },
      jobId: `create-template-tables-${tablesDatabaseId}`,
    },
    schedule: {
      type: 'one-time',
      date: dayjs(),
    },
  });
}
