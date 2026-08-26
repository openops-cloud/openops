import { logger } from '@openops/server-shared';
import dayjs from 'dayjs';
import cron from 'node-cron';
import { SystemJobSchedule } from './common';
import { systemJobHandlers } from './job-handlers';

// Every scheduled job holds a live timer whose closure reaches the whole
// application graph, so the timer must be cancellable: an app that shuts down
// without cancelling leaks its entire module graph.
const scheduled = new Map<string, () => void>();

export const memorySystemJobSchedulerService: SystemJobSchedule = {
  async init(): Promise<void> {
    //
  },
  async upsertJob({ job, schedule }): Promise<void> {
    const key = job.jobId ?? job.name;
    if (scheduled.has(key)) {
      return;
    }
    const jobHandler = systemJobHandlers.getJobHandler(job.name);
    switch (schedule.type) {
      case 'one-time': {
        const diff = schedule.date.diff(dayjs(), 'milliseconds');
        if (diff > 0) {
          const timeout = setTimeout(() => {
            scheduled.set(key, () => undefined);
            jobHandler(job.data).catch(logger.error);
          }, diff);
          scheduled.set(key, () => clearTimeout(timeout));
        } else {
          scheduled.set(key, () => undefined);
        }
        break;
      }
      case 'repeated': {
        const cronExpression = schedule.cron;
        const task = cron.schedule(cronExpression, () => {
          jobHandler(job.data).catch(logger.error);
        });
        scheduled.set(key, () => task.stop());
        break;
      }
    }
  },
  async removeJob(jobId: string): Promise<void> {
    scheduled.get(jobId)?.();
    scheduled.delete(jobId);
  },
  async close(): Promise<void> {
    for (const cancel of scheduled.values()) {
      cancel();
    }
    scheduled.clear();
  },
};
