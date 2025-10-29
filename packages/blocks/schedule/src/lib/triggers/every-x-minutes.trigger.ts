import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';

function calculateEveryXMinutesCron(minutes: number) {
  const cronExpression = `*/${minutes} * * * *`;
  return { cronExpression };
}

function getEveryXMinutesData(minutes: number) {
  const { cronExpression } = calculateEveryXMinutesCron(minutes);
  return Promise.resolve([
    {
      cron_expression: cronExpression,
      timezone: 'UTC',
      startDate: new Date(),
    },
  ]);
}

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
    const { cronExpression } = calculateEveryXMinutesCron(
      ctx.propsValue.minutes,
    );
    ctx.setSchedule({
      cronExpression: cronExpression,
      timezone: 'UTC',
    });
  },
  test(ctx) {
    return getEveryXMinutesData(ctx.propsValue.minutes);
  },
  run(ctx) {
    return getEveryXMinutesData(ctx.propsValue.minutes);
  },
  onDisable: async () => {
    console.log('onDisable');
  },
});
