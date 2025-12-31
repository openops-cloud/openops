import { authenticateUserInOpenOpsTables } from '@openops/common';
import dayjs from 'dayjs';
import { systemJobsSchedule } from '../../helper/system-jobs';
import {
  CreateTemplateTablesSystemJobData,
  SystemJobName,
} from '../../helper/system-jobs/common';
import { systemJobHandlers } from '../../helper/system-jobs/job-handlers';
import { userService } from '../../user/user-service';
import { createAllTemplateTables } from './create-all-template-tables';

export function registerTemplateTablesCreationJobHandler(): void {
  systemJobHandlers.registerJobHandler(
    SystemJobName.CREATE_TEMPLATE_TABLES,
    async (data) => {
      const user = await userService.getOneOrThrow({ id: data.userId });
      const { token } = await authenticateUserInOpenOpsTables(
        user.email,
        user.password,
      );
      await createAllTemplateTables({
        tablesDatabaseId: data.tablesDatabaseId,
        bearerToken: token,
      });
    },
  );
}

export async function addTemplateTablesCreationJob({
  tablesDatabaseId,
  userId,
}: CreateTemplateTablesSystemJobData): Promise<void> {
  await systemJobsSchedule.upsertJob({
    job: {
      name: SystemJobName.CREATE_TEMPLATE_TABLES,
      data: {
        tablesDatabaseId,
        userId,
      },
      jobId: `create-template-tables-${tablesDatabaseId}`,
    },
    schedule: {
      type: 'one-time',
      date: dayjs(),
    },
  });
}
