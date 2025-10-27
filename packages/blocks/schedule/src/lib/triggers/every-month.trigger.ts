import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';
import {
  DAY_HOURS,
  getTriggerData,
  MONTH_DAYS,
  timezoneOptions,
  validateHours,
  validateMonthDays,
} from '../common';

function calculateEveryMonthCron(hourOfTheDay: number, dayOfTheMonth: number) {
  const validatedHour = validateHours(hourOfTheDay);
  const validatedDay = validateMonthDays(dayOfTheMonth);
  const cronExpression = `0 ${validatedHour} ${validatedDay} * *`;
  return { validatedHour, validatedDay, cronExpression };
}

function getEveryMonthData(
  hourOfTheDay: number,
  dayOfTheMonth: number,
  timezone = 'UTC',
) {
  const { validatedHour, validatedDay, cronExpression } =
    calculateEveryMonthCron(hourOfTheDay, dayOfTheMonth);
  return getTriggerData(timezone, {
    hour_of_the_day: validatedHour,
    day_of_the_month: validatedDay,
    cron_expression: cronExpression,
    timezone: timezone,
  });
}

export const everyMonthTrigger = createTrigger({
  name: 'every_month',
  displayName: 'Every Month',
  description: 'Triggers the current flow every month',
  type: TriggerStrategy.SCHEDULED,
  sampleData: {},
  props: {
    day_of_the_month: Property.StaticDropdown({
      displayName: 'Day of the month',
      options: {
        options: MONTH_DAYS.map((d, idx) => {
          return {
            label: (1 + d).toString(),
            value: idx + 1,
          };
        }),
      },
      required: true,
    }),
    hour_of_the_day: Property.StaticDropdown({
      displayName: 'Hour of the day',
      options: {
        options: DAY_HOURS.map((d, idx) => {
          return {
            label: d,
            value: idx,
          };
        }),
      },
      required: true,
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
  onEnable: async (ctx) => {
    const { cronExpression } = calculateEveryMonthCron(
      ctx.propsValue.hour_of_the_day,
      ctx.propsValue.day_of_the_month,
    );
    ctx.setSchedule({
      cronExpression: cronExpression,
      timezone: ctx.propsValue.timezone,
    });
  },
  test(ctx) {
    return getEveryMonthData(
      ctx.propsValue.hour_of_the_day,
      ctx.propsValue.day_of_the_month,
      ctx.propsValue.timezone,
    );
  },
  run(ctx) {
    return getEveryMonthData(
      ctx.propsValue.hour_of_the_day,
      ctx.propsValue.day_of_the_month,
      ctx.propsValue.timezone,
    );
  },
  onDisable: async () => {
    console.log('onDisable');
  },
});
