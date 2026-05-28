import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AppConnectionStatus } from '@openops/shared';
import { In } from 'typeorm';
import { repoFactory } from '../core/db/repo-factory';
import { systemJobsSchedule } from '../helper/system-jobs';
import { SystemJobName } from '../helper/system-jobs/common';
import { systemJobHandlers } from '../helper/system-jobs/job-handlers';
import { ProjectEntity } from '../project/project-entity';
import { appConnectionService } from './app-connection-service/app-connection-service';
import { AppConnectionEntity } from './app-connection.entity';

const connectionRepo = repoFactory(AppConnectionEntity);
const projectRepo = repoFactory(ProjectEntity);

const CONNECTION_VALIDATION_CRON = system.get(
  AppSystemProp.CONNECTION_VALIDATION_CRON,
);

export const registerConnectionValidationJob = async (): Promise<void> => {
  systemJobHandlers.registerJobHandler(
    SystemJobName.CONNECTION_VALIDATION,
    async (): Promise<void> => {
      logger.info('Connection validation job started');

      try {
        await validateConnections();
      } catch (error) {
        logger.error('Connection validation job failed', error);
      }

      logger.info("Connection validation job completed successfully'");
    },
  );

  if (!CONNECTION_VALIDATION_CRON) {
    logger.warn(
      'Connection validation job is disabled because CONNECTION_VALIDATION_CRON is not configured',
    );

    return;
  }

  await systemJobsSchedule.upsertJob({
    job: {
      name: SystemJobName.CONNECTION_VALIDATION,
      data: undefined,
    },
    schedule: {
      type: 'repeated',
      cron: CONNECTION_VALIDATION_CRON,
    },
  });
};

async function validateConnections(): Promise<void> {
  const activeConnections = await connectionRepo().find({
    where: {
      status: AppConnectionStatus.ACTIVE,
    },
  });

  const projectIds = [...new Set(activeConnections.map((c) => c.projectId))];

  const projects = await projectRepo().find({
    where: {
      id: In(projectIds),
    },
  });

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  for (const connection of activeConnections) {
    try {
      await appConnectionService.validateConnections(connection);
    } catch (error) {
      const project = projectsById.get(connection.projectId);

      logger.warn(`Failed to validate connection`, {
        projectName: project?.displayName,
        projectId: connection.projectId,
        connectionName: connection.name,
        connectionId: connection.id,
        error,
      });
    }
  }
}
