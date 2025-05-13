import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Markdown,
} from '@openops/components/ui';
import { CodeAction } from '@openops/shared';
import { t } from 'i18next';
import React from 'react';
import { useFormContext } from 'react-hook-form';

import { DictionaryProperty } from '../../block-properties/dictionary-property';

import { CodeEditior } from './code-editior';

const markdown = `
To use data from previous steps in your code, include them as pairs of keys and values below.

You can access these inputs in your code using \`inputs.key\`, where \`key\` is the name you assigned below.

**⚠️ Warning: "const code" is the entry to the code. If it is removed or renamed, your step will fail.**
`;

type CodeSettingsProps = {
  readonly: boolean;
};

const CodeSettings = React.memo(({ readonly }: CodeSettingsProps) => {
  const form = useFormContext<CodeAction>();
  // const [setLeftSidebar] = useBuilderStateContext((state) => [
  //   state.setLeftSidebar,
  // ]);

  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="settings.input"
        render={({ field }) => (
          <FormItem>
            <div className="pb-4">
              <Markdown markdown={markdown} />
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
