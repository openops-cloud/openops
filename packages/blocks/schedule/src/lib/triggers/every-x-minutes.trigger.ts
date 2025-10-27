import {
  Property,
  TriggerStrategy,
  createTrigger,
} from '@openops/blocks-framework';
import { getTriggerData } from '../common';

export const everyXMinutesTrigger = createTrigger({
  name: 'every_x_minutes',
  displayName: 'Every X Minutes',
  description: 'Triggers the current flow every X minutes',
  type: TriggerStrategy.SCHEDULED,
  sampleData: {},
  props: {
    minutes: Property.StaticDropdown({
      displayName: 'Minutes',
      description: 'Valid value between 1 to 59.',
      required: true,
      defaultValue: 1,
      options: {
        disabled: false,
        options: Array.from({ length: 59 }, (_, index) => ({
          label: `${index + 1} minute${index !== 0 ? 's' : ''}`,
          value: index + 1,
        })),
      },
    }),
  },
  onEnable: async (ctx) => {
    const cronExpression = `*/${ctx.propsValue.minutes} * * * *`;
    ctx.setSchedule({
      cronExpression: cronExpression,
      timezone: 'UTC',
    });
  },
  test(ctx) {
    const cronExpression = `*/${ctx.propsValue.minutes} * * * *`;
    return getTriggerData('UTC', {
      minutes: ctx.propsValue.minutes,
      cron_expression: cronExpression,
    });
  },
  run(ctx) {
    const cronExpression = `*/${ctx.propsValue.minutes} * * * *`;
    return getTriggerData('UTC', {
      cron_expression: cronExpression,
      timezone: 'UTC',
    });
  },
  onDisable: async () => {
    console.log('onDisable');
  },
});
