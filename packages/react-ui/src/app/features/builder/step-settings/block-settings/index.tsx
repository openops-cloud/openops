import { Skeleton } from '@openops/components/ui';
import React from 'react';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import {
  BlockAction,
  BlockActionSettings,
  BlockTrigger,
  BlockTriggerSettings,
  FlagId,
  isNil,
} from '@openops/shared';

import { AutoPropertiesFormComponent } from '../../block-properties/auto-properties-form';

import { ConnectionSelect } from './connection-select';

type BlockSettingsProps = {
  step: BlockAction | BlockTrigger;
  flowId: string;
  readonly: boolean;
};

const removeAuthFromProps = (
  props: Record<string, any>,
): Record<string, any> => {
  const { auth, ...rest } = props;
  return rest;
};

const BlockSettings = React.memo((props: BlockSettingsProps) => {
  const { blockModel, isLoading } = blocksHooks.useBlock({
    name: props.step.settings.blockName,
    version: props.step.settings.blockVersion,
  });

  const providerKey = blockModel?.auth?.authProviderKey;
  const actionName = (props.step.settings as BlockActionSettings).actionName;

  const selectedAction = actionName
    ? blockModel?.actions[actionName]
    : undefined;
  const triggerName = (props.step.settings as BlockTriggerSettings).triggerName;
  const selectedTrigger = triggerName
    ? blockModel?.triggers[triggerName]
    : undefined;

  const actionPropsWithoutAuth = removeAuthFromProps(
    selectedAction?.props ?? {},
  );
  const triggerPropsWithoutAuth = removeAuthFromProps(
    selectedTrigger?.props ?? {},
  );

  const { data: webhookPrefixUrl } = flagsHooks.useFlag<string>(
    FlagId.WEBHOOK_URL_PREFIX,
  );

  const { data: frontendUrl } = flagsHooks.useFlag<string>(FlagId.FRONTEND_URL);
  const markdownVariables = React.useMemo(
    () => ({
      webhookUrl: `${webhookPrefixUrl}/${props.flowId}`,
      formUrl: `${frontendUrl}/forms/${props.flowId}`,
    }),
    [webhookPrefixUrl, frontendUrl, props.flowId],
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="w-full h-8" />
          ))}
        </div>
      )}
      {blockModel && (
        <>
          {blockModel.auth &&
            (selectedAction?.requireAuth || selectedTrigger) && (
              <ConnectionSelect
                allowDynamicValues={isNil(selectedTrigger)}
                block={blockModel}
                disabled={props.readonly}
                name={'settings.input.auth'}
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                providerKey={providerKey!}
              ></ConnectionSelect>
            )}
          {selectedAction && (
            <AutoPropertiesFormComponent
              key={selectedAction.name}
              prefixValue={'settings.input'}
              props={actionPropsWithoutAuth}
              allowDynamicValues={true}
              disabled={props.readonly}
              useMentionTextInput={true}
              markdownVariables={markdownVariables}
            ></AutoPropertiesFormComponent>
          )}
          {selectedTrigger && (
            <AutoPropertiesFormComponent
              key={selectedTrigger.name}
              prefixValue={'settings.input'}
              props={triggerPropsWithoutAuth}
              useMentionTextInput={true}
              allowDynamicValues={true}
              disabled={props.readonly}
              markdownVariables={markdownVariables}
            ></AutoPropertiesFormComponent>
          )}
        </>
      )}
    </div>
  );
});

BlockSettings.displayName = 'BlockSettings';
export { BlockSettings };
