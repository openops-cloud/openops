import { ProjectId } from '@openops/shared';
import { Dayjs } from 'dayjs';
import { TablesServerContext } from '@openops/common';

export enum SystemJobName {
  HARD_DELETE_PROJECT = 'hard-delete-project',
  PROJECT_USAGE_REPORT = 'project-usage-report',
  USAGE_REPORT = 'usage-report',
  BLOCKS_ANALYTICS = 'blocks-analytics',
  BLOCKS_SYNC = 'blocks-sync',
  TRIAL_TRACKER = 'trial-tracker',
  TRIGGER_DATA_CLEANER = 'trigger-data-cleaner',
  ISSUES_REMINDER = 'issue-reminder',
  LOGS_CLEANUP_TRIGGER = 'logs-cleanup-trigger',
  CREATE_TEMPLATE_TABLES = 'create-template-tables',
}

type HardDeleteProjectSystemJobData = {
  projectId: ProjectId;
};
type IssuesReminderSystemJobData = {
  projectId: ProjectId;
  projectName: string;
  organizationId: string;
};

type SystemJobDataMap = {
  [SystemJobName.HARD_DELETE_PROJECT]: HardDeleteProjectSystemJobData;
  [SystemJobName.ISSUES_REMINDER]: IssuesReminderSystemJobData;
  [SystemJobName.PROJECT_USAGE_REPORT]: Record<string, never>;
  [SystemJobName.USAGE_REPORT]: Record<string, never>;
  [SystemJobName.BLOCKS_ANALYTICS]: Record<string, never>;
  [SystemJobName.BLOCKS_SYNC]: Record<string, never>;
  [SystemJobName.TRIAL_TRACKER]: Record<string, never>;
  [SystemJobName.TRIGGER_DATA_CLEANER]: Record<string, never>;
  [SystemJobName.LOGS_CLEANUP_TRIGGER]: Record<string, never>;
  [SystemJobName.CREATE_TEMPLATE_TABLES]: TablesServerContext;
};

export type SystemJobData<T extends SystemJobName = SystemJobName> =
  T extends SystemJobName ? SystemJobDataMap[T] : never;

export type SystemJobDefinition<T extends SystemJobName> = {
  name: T;
  data: SystemJobData<T>;
  jobId?: string;
};

export type SystemJobHandler<T extends SystemJobName = SystemJobName> = (
  data: SystemJobData<T>,
) => Promise<void>;

type OneTimeJobSchedule = {
  type: 'one-time';
  date: Dayjs;
};

type RepeatedJobSchedule = {
  type: 'repeated';
  cron: string;
};

export type JobSchedule = OneTimeJobSchedule | RepeatedJobSchedule;

type UpsertJobParams<T extends SystemJobName> = {
  job: SystemJobDefinition<T>;
  schedule: JobSchedule;
};

export type SystemJobSchedule = {
  init(): Promise<void>;
  upsertJob<T extends SystemJobName>(params: UpsertJobParams<T>): Promise<void>;
  close(): Promise<void>;
};
