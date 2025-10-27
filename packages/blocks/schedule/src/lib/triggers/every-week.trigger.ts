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
  validateWeekDays,
  WEEK_DAYS,
} from '../common';

function calculateEveryWeekCron(hourOfTheDay: number, dayOfTheWeek: number) {
  const validatedHour = validateHours(hourOfTheDay);
  const validatedDay = validateWeekDays(dayOfTheWeek);
  const cronExpression = `0 ${validatedHour} * * ${validatedDay}`;
  return { validatedHour, validatedDay, cronExpression };
}

function getEveryWeekData(
  hourOfTheDay: number,
  dayOfTheWeek: number,
  timezone = 'UTC',
) {
  const { validatedHour, validatedDay, cronExpression } =
    calculateEveryWeekCron(hourOfTheDay, dayOfTheWeek);
  return getTriggerData(timezone, {
    hour_of_the_day: validatedHour,
    day_of_the_week: validatedDay,
    cron_expression: cronExpression,
    timezone: timezone,
  });
}

export const everyWeekTrigger = createTrigger({
  name: 'every_week',
  displayName: 'Every Week',
  description: 'Triggers the current flow every week',
  type: TriggerStrategy.SCHEDULED,
  sampleData: {},
  props: {
    day_of_the_week: Property.StaticDropdown({
      displayName: 'Day of the week',
      options: {
        options: WEEK_DAYS.map((d, idx) => {
          return {
            label: d,
            value: idx,
          };
        }),
      },
      required: true,
    }),
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
    const { cronExpression } = calculateEveryWeekCron(
      ctx.propsValue.hour_of_the_day,
      ctx.propsValue.day_of_the_week,
    );
    ctx.setSchedule({
      cronExpression: cronExpression,
      timezone: ctx.propsValue.timezone,
    });
  },
  test(ctx) {
    return getEveryWeekData(
      ctx.propsValue.hour_of_the_day,
      ctx.propsValue.day_of_the_week,
      ctx.propsValue.timezone,
    );
  },
  run(ctx) {
    return getEveryWeekData(
      ctx.propsValue.hour_of_the_day,
      ctx.propsValue.day_of_the_week,
      ctx.propsValue.timezone,
    );
  },
  onDisable: async () => {
    console.log('onDisable');
  },
});
