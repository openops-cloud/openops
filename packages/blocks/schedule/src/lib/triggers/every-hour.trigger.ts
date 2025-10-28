import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';

function calculateEveryHourCron(runOnWeekends: boolean) {
  const cronExpression = runOnWeekends ? `0 * * * *` : `0 * * * 1-5`;
  return { cronExpression };
}

function getEveryHourData(runOnWeekends: boolean) {
  const { cronExpression } = calculateEveryHourCron(runOnWeekends);
  return Promise.resolve([
    {
      cron_expression: cronExpression,
      timezone: 'UTC',
      startDate: new Date(),
    },
  ]);
}

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
    const { cronExpression } = calculateEveryHourCron(
      ctx.propsValue.run_on_weekends,
    );
    ctx.setSchedule({
      cronExpression: cronExpression,
      timezone: 'UTC',
    });
  },
  test(ctx) {
    return getEveryHourData(ctx.propsValue.run_on_weekends);
  },
  run(ctx) {
    return getEveryHourData(ctx.propsValue.run_on_weekends);
  },
  onDisable: async () => {
    console.log('onDisable');
  },
});
