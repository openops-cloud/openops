import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import React, { RefObject } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { CodeMirrorEditor } from './code-mirror-editor';

const tryParseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

type JsonEditorProps = {
  field:
    | ControllerRenderProps<Record<string, any>, string>
    | Record<string, any>;
  readonly: boolean;
  onFocus?: (ref: RefObject<ReactCodeMirrorRef>) => void;
  className?: string;
  containerClassName?: string;
  theme?: string;
  placeholder?: string;
};

const JsonEditor = React.memo(
  ({
    field,
    readonly,
    onFocus,
    className,
    containerClassName,
    theme,
    placeholder,
  }: JsonEditorProps) => {
    return (
      <CodeMirrorEditor
        value={field.value}
        readonly={readonly}
        onFocus={onFocus}
        className={className}
        containerClassName={containerClassName}
        theme={theme}
        placeholder={placeholder}
        onChange={(value) => {
          field.onChange?.(tryParseJson(value));
        }}
      />
    );
  },
);

JsonEditor.displayName = 'JsonEditor';
export { JsonEditor };
