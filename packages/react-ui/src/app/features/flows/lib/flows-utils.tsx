import { ActionBase } from '@openops/blocks-framework';
import {
  BlockStepMetadataWithSuggestions,
  StepMetadataWithSuggestions,
} from '@openops/components/ui';
import cronstrue from 'cronstrue/i18n';
import { t } from 'i18next';
import { TimerReset, TriangleAlert, Zap } from 'lucide-react';

import { ActionType, Flow, FlowVersion, TriggerType } from '@openops/shared';

import { flowsApi } from './flows-api';

const downloadFile = (
  obj: any,
  fileName: string,
  extension: 'txt' | 'json',
) => {
  const blob = new Blob([obj], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadFlow = async (flowId: string, versionId: string) => {
  const template = await flowsApi.getTemplate(flowId, { versionId });
  downloadFile(JSON.stringify(template, null, 2), template.name, 'json');
};

const getActionMetadata = (
  metadata: StepMetadataWithSuggestions[] | undefined,
  blockName: string,
  actionName: string | undefined,
): ActionBase | undefined => {
  const blockStepMetadata = metadata?.find(
    (stepMetadata: StepMetadataWithSuggestions) =>
      stepMetadata.type === ActionType.BLOCK &&
      (stepMetadata as BlockStepMetadataWithSuggestions).blockName ===
        blockName,
  ) as BlockStepMetadataWithSuggestions | undefined;

  return blockStepMetadata?.suggestedActions?.find(
    (suggestedAction) => suggestedAction.name === actionName,
  );
};

export const flowsUtils = {
  downloadFlow,
  getActionMetadata,
  flowStatusToolTipRenderer: (flow: Flow, version: FlowVersion) => {
    const trigger = version.trigger;
    switch (trigger.type) {
      case TriggerType.BLOCK: {
        const cronExpression = flow.schedule?.cronExpression;
        return cronExpression
          ? `${t('Run')} ${cronstrue
              .toString(cronExpression, { locale: 'en' })
              .toLocaleLowerCase()}`
          : t('Real time workflow');
      }
      case TriggerType.EMPTY:
        console.error(
          t("Workflow can't be published with empty trigger {name}", {
            name: version.displayName,
          }),
        );
        return t('Please contact support as your published flow has a problem');
    }
  },
  flowStatusIconRenderer: (flow: Flow, version: FlowVersion) => {
    const trigger = version.trigger;
    switch (trigger.type) {
      case TriggerType.BLOCK: {
        const cronExpression = flow.schedule?.cronExpression;
        if (cronExpression) {
          return <TimerReset className="h-4 w-4 text-primary" />;
        } else {
          return <Zap className="h-4 w-4 text-foreground fill-primary" />;
        }
      }
      case TriggerType.EMPTY: {
        console.error(
          t("Workflow can't be published with empty trigger {name}", {
            name: version.displayName,
          }),
        );
        return <TriangleAlert className="h-4 w-4 text-destructive" />;
      }
    }
  },
};
