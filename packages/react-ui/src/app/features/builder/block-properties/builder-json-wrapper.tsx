import { ControllerRenderProps } from 'react-hook-form';

import { useTheme } from '@/app/common/providers/theme-provider';
import { textMentionUtils } from '@/app/features/builder/block-properties/text-input-with-mentions/text-input-utils';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { CodeEditor, tryParseJson } from '@openops/components/ui';
import { RefObject, useCallback } from 'react';

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

  const onFocus = useCallback(
    (ref: RefObject<any>) => {
      setInsertStateHandler((propertyPath) => {
        if (ref.current) {
          const editor = ref.current;
          const position = editor.getPosition();
          if (position) {
            editor.executeEdits('insert-text', [
              {
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
                text: `"{{${propertyPath}}}"`,
              },
            ]);
          }
        }
      });
    },
    [setInsertStateHandler],
  );

  return (
    <div className="h-48">
      <CodeEditor
        value={field.value}
        readonly={disabled ?? false}
        theme={theme}
        onFocus={onFocus}
        className={textMentionUtils.inputThatUsesMentionClass}
        onChange={(value) => {
          field.onChange(tryParseJson(value));
        }}
      />
    </div>
  );
};

BuilderJsonEditorWrapper.displayName = 'BuilderJsonEditorWrapper';
export { BuilderJsonEditorWrapper };
