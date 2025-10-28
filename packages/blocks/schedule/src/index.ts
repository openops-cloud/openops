import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { cronExpressionTrigger } from './lib/triggers/cron-expression.trigger';
import { everyDayTrigger } from './lib/triggers/every-day.trigger';
import { everyHourTrigger } from './lib/triggers/every-hour.trigger';
import { everyMonthTrigger } from './lib/triggers/every-month.trigger';
import { everyWeekTrigger } from './lib/triggers/every-week.trigger';
import { everyXMinutesTrigger } from './lib/triggers/every-x-minutes.trigger';

export const schedule = createBlock({
  displayName: 'Schedule',
  logoUrl: 'https://static.openops.com/blocks/openops-schedule.svg',
  description: 'Trigger flow with fixed schedule',
  categories: [BlockCategory.CORE],
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.5.0',
  authors: ['kishanprmr', 'AbdulTheActiveBlockr', 'khaledmashaly', 'abuaboud'],
  actions: [],
  triggers: [
    everyXMinutesTrigger,
    everyHourTrigger,
    everyDayTrigger,
    everyWeekTrigger,
    everyMonthTrigger,
    cronExpressionTrigger,
  ],
});
