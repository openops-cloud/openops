import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';
import { isValidCron } from 'cron-validator';
import { timezoneOptions } from '../common';

export const cronExpressionTrigger = createTrigger({
  name: 'cron_expression',
  displayName: 'Cron Expression',
  description: 'Trigger based on a cron expression schedule',
  props: {
    cronExpression: Property.ShortText({
      displayName: 'Cron Expression',
      description: 'The cron schedule pattern (e.g., 0/5 * * * * for every 5 minutes)',
      required: true,
      defaultValue: '0/5 * * * *',
    }),
    timezone: Property.StaticDropdown<string>({
      displayName: 'Timezone',
      options: {
        options: timezoneOptions,
      },
      required: true,
      defaultValue: 'UTC',
    }),
  },
  type: TriggerStrategy.SCHEDULED,
  sampleData: {},
  onEnable: async (ctx) => {
    ctx.setSchedule({
      cronExpression: ctx.propsValue.cronExpression,
      timezone: ctx.propsValue.timezone,
    });
  },
  async test(context) {
    if (!isValidCron(context.propsValue.cronExpression)) {
      return [`Invalid cron expression: ${context.propsValue.cronExpression}`];
    }
    return [
      {
        startDate: new Date(),
      },
    ];
  },
  async run() {
    return [
      {
        startDate: new Date(),
      },
    ];
  },
  onDisable: async () => {
    console.log('onDisable');
  },
});
