import { ControllerRenderProps } from 'react-hook-form';

import { useTheme } from '@/app/common/providers/theme-provider';
import { textMentionUtils } from '@/app/features/builder/block-properties/text-input-with-mentions/text-input-utils';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { CodeEditor, tryParseJson } from '@openops/components/ui';

interface BuilderJsonEditorWrapperProps {
  field: ControllerRenderProps<Record<string, any>, string>;
  disabled?: boolean;
}

const BuilderJsonEditorWrapper = ({
  field,
  disabled,
}: BuilderJsonEditorWrapperProps) => {
  const [setInsertStateHandler] = useBuilderStateContext((state) => [
    state.setInsertMentionHandler,
  ]);

  const { theme } = useTheme();

  return (
    <CodeEditor
      value={field.value}
      readonly={disabled ?? false}
      theme={theme}
      onFocus={(ref) => {
        setInsertStateHandler((propertyPath) => {
          ref.current?.view?.dispatch({
            changes: {
              from: ref.current.view.state.selection.main.head,
              insert: `{{${propertyPath}}}`,
            },
          });
        });
      }}
      className={textMentionUtils.inputThatUsesMentionClass}
      onChange={(value) => {
        field.onChange(tryParseJson(value));
      }}
    />
  );
};

BuilderJsonEditorWrapper.displayName = 'BuilderJsonEditorWrapper';
export { BuilderJsonEditorWrapper };
