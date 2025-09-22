import { TriggerType } from '@openops/shared';
import cronstrue from 'cronstrue/i18n';

export function getShortTriggerExplanation(
  trigger: any,
  triggerMetadata: any,
  flow: any,
): string {
  if (trigger.type === TriggerType.EMPTY) {
    return 'it runs when started manually';
  }
  if (trigger.type === TriggerType.BLOCK) {
    const blockName = triggerMetadata?.displayName?.trim();
    const cronExpression = flow.schedule?.cronExpression;

    if (blockName === 'Schedule' && cronExpression) {
      const scheduleDescription = cronstrue
        .toString(cronExpression, { locale: 'en' })
        .toLowerCase();
      return `it runs on a schedule (${scheduleDescription})`;
    }

    if (blockName === 'Webhook') {
      return 'it runs when the webhook is triggered';
    }

    const display = trigger.displayName?.trim();
    if (display && blockName) {
      return `it runs on ${display} from ${blockName}`;
    }
  }
  return 'it runs when its trigger condition is met';
}
