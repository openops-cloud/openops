import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';
import { getTriggerData } from '../common';

export const everyHourTrigger = createTrigger({
  name: 'every_hour',
  displayName: 'Every Hour',
  description: 'Triggers the current flow every hour',
  type: TriggerStrategy.SCHEDULED,
  sampleData: {},
  props: {
    run_on_weekends: Property.Checkbox({
      displayName: 'Run on weekends (Sat,Sun)',
      required: true,
      defaultValue: false,
    }),
  },
  onEnable: async (ctx) => {
    const cronExpression = ctx.propsValue.run_on_weekends
      ? `0 * * * *`
      : `0 * * * 1-5`;
    ctx.setSchedule({
      cronExpression: cronExpression,
      timezone: 'UTC',
    });
  },
  test(ctx) {
    const cronExpression = ctx.propsValue.run_on_weekends
      ? `0 * * * *`
      : `0 * * * 1-5`;
    return getTriggerData('UTC', {
      cron_expression: cronExpression,
      timezone: 'UTC',
    });
  },
  run(ctx) {
    const cronExpression = ctx.propsValue.run_on_weekends
      ? `0 * * * *`
      : `0 * * * 1-5`;
    return getTriggerData('UTC', {
      cron_expression: cronExpression,
      timezone: 'UTC',
    });
  },
  onDisable: async () => {
    console.log('onDisable');
  },
});
