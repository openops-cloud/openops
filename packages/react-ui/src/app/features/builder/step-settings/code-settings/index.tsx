import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  GenerateWithAIButton,
  Markdown,
} from '@openops/components/ui';
import { CodeAction } from '@openops/shared';
import { t } from 'i18next';
import React, { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import { DictionaryProperty } from '../../block-properties/dictionary-property';

import { useTheme } from '@/app/common/providers/theme-provider';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import { PropertyType } from '@openops/blocks-framework';
import { useSafeBuilderStateContext } from '../../builder-hooks';
import { ExpandableContent } from '../expandable-markdown';
import { CodeEditior } from './code-editior';

const markdown = `
To use data from previous steps in your code, include them as pairs of keys and values below.
You can access these inputs in your code using \`inputs.key\`, where \`key\` is the name you assigned below.
**⚠️ Warning: "const code" is the entry to the code. If it is removed or renamed, your step will fail.**`;

type CodeSettingsProps = {
  readonly: boolean;
};

const CodeSettings = React.memo(({ readonly }: CodeSettingsProps) => {
  const { theme } = useTheme();
  const form = useFormContext<CodeAction>();

  const { setIsAiChatOpened } = useAppStore((s) => ({
    setIsAiChatOpened: s.setIsAiChatOpened,
  }));

  const isAiChatVisible = useSafeBuilderStateContext(
    (s) => s?.midpanelState?.showAiChat,
  );

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const dispatch = useSafeBuilderStateContext(
    (state) => state.applyMidpanelAction,
  );

  const onGenerateWithAIClick = useCallback(() => {
    dispatch?.({
      type: 'GENERATE_WITH_AI_CLICK',
      property: {
        inputName: 'settings.sourceCode',
        displayName: 'Source Code',
        valueSchema: { type: 'string' },
        type: PropertyType.JSON,
        required: false,
      },
    });
    setIsAiChatOpened(false);
  }, [dispatch, setIsAiChatOpened]);

  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="settings.input"
        render={({ field }) => (
          <FormItem>
            <div className="pb-4">
              <ExpandableContent fullContent={markdown}>
                {(content) => (
                  <Markdown
                    markdown={content}
                    theme={theme}
                    withBorder={false}
                    textClassName="leading-relaxed"
                  />
                )}
              </ExpandableContent>
            </div>

            <div className="flex items-center justify-between">
              <FormLabel>{t('Inputs')}</FormLabel>
            </div>

            <DictionaryProperty
              disabled={readonly}
              values={field.value}
              onChange={field.onChange}
              useMentionTextInput={true}
            ></DictionaryProperty>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="settings.sourceCode"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between mb-2">
              <FormLabel>{t('Source Code')}</FormLabel>
              {!readonly && (
                <GenerateWithAIButton
                  hasActiveAiSettings={hasActiveAiSettings}
                  isLoading={isLoading}
                  isAiChatVisible={!!isAiChatVisible}
                  onGenerateWithAIClick={onGenerateWithAIClick}
                  settingsPath="/settings/ai"
                />
              )}
            </div>
            <CodeEditior
              sourceCode={field.value}
              onChange={field.onChange}
              readonly={readonly}
            ></CodeEditior>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
});
CodeSettings.displayName = 'CodeSettings';
export { CodeSettings };
