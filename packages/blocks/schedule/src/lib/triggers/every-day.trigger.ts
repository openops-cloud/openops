import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';
import {
  DAY_HOURS,
  getTriggerData,
  timezoneOptions,
  validateHours,
} from '../common';

function calculateEveryDayCron(hourOfTheDay: number, runOnWeekends: boolean) {
  const validatedHour = validateHours(hourOfTheDay);
  const cronExpression = runOnWeekends
    ? `0 ${validatedHour} * * *`
    : `0 ${validatedHour} * * 1-5`;
  return { validatedHour, cronExpression };
}

function getEveryDayData(
  hourOfTheDay: number,
  timezone = 'UTC',
  runOnWeekends: boolean,
) {
  const { validatedHour, cronExpression } = calculateEveryDayCron(
    hourOfTheDay,
    runOnWeekends,
  );
  return getTriggerData(timezone, {
    hour_of_the_day: validatedHour,
    timezone: timezone,
    cron_expression: cronExpression,
  });
}

export const everyDayTrigger = createTrigger({
  name: 'every_day',
  displayName: 'Every Day',
  description: 'Triggers the current flow every day',
  type: TriggerStrategy.SCHEDULED,
  sampleData: {},
  props: {
    hour_of_the_day: Property.StaticDropdown({
      displayName: 'Hour of the day',
      options: {
        options: DAY_HOURS.map((h, idx) => {
          return {
            label: h,
            value: idx,
          };
        }),
      },
      required: true,
      defaultValue: 0,
    }),
    timezone: Property.StaticDropdown<string>({
      displayName: 'Timezone',
      options: {
        options: timezoneOptions,
      },
      required: true,
      defaultValue: 'UTC',
    }),
    run_on_weekends: Property.Checkbox({
      displayName: 'Run on weekends (Sat,Sun)',
      required: true,
      defaultValue: false,
    }),
  },
  onEnable: async (ctx) => {
    const { cronExpression } = calculateEveryDayCron(
      ctx.propsValue.hour_of_the_day,
      ctx.propsValue.run_on_weekends,
    );
    ctx.setSchedule({
      cronExpression: cronExpression,
      timezone: ctx.propsValue.timezone,
    });
  },
  test(ctx) {
    return getEveryDayData(
      ctx.propsValue.hour_of_the_day,
      ctx.propsValue.timezone,
      ctx.propsValue.run_on_weekends,
    );
  },
  run(ctx) {
    return getEveryDayData(
      ctx.propsValue.hour_of_the_day,
      ctx.propsValue.timezone,
      ctx.propsValue.run_on_weekends,
    );
  },
  onDisable: async () => {
    console.log('onDisable');
  },
});
