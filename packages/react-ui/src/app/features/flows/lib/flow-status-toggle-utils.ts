import type { StepMetadata } from '@openops/components/ui';
import { Flow, Trigger, TriggerType } from '@openops/shared';
import cronstrue from 'cronstrue/i18n';
import i18n, { t } from 'i18next';

export function getShortTriggerExplanation(
  trigger: Trigger,
  triggerMetadata: StepMetadata | undefined,
  flow: Flow,
): string {
  if (trigger.type === TriggerType.EMPTY) {
    return t('Workflow is on, it runs when started manually');
  }
  if (trigger.type === TriggerType.BLOCK) {
    const blockName = triggerMetadata?.displayName?.trim();
    const cronExpression = flow.schedule?.cronExpression;

    if (blockName === 'Schedule' && cronExpression) {
      const scheduleDescription = cronstrue
        .toString(cronExpression, { locale: i18n.language })
        .toLowerCase();
      return t(`Workflow is on, it runs on a schedule ({schedule})`, {
        schedule: scheduleDescription,
      });
    }

    if (blockName === 'Webhook') {
      return t('Workflow is on, it runs when the webhook is triggered');
    }

    const display = trigger.displayName?.trim();
    if (display && blockName) {
      return t(
        `Workflow is on, it runs on "{display}" trigger from {blockName}`,
        {
          display: display,
          blockName: blockName,
        },
      );
    }
  }
  return t('Workflow is on, it runs when its trigger condition is met');
}
