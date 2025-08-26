import { isNil } from '@openops/shared';
import { t } from 'i18next';
import { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Theme } from '../../lib/theme';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '../../ui/form';
import { CodeEditor } from '../code-editor';

type JsonFormValues = {
  jsonContent: string;
};

type JsonContentProps = {
  isEditMode: boolean;
  json: any;
  form: UseFormReturn<JsonFormValues>;
  theme: Theme;
  validateJson?: (value: string) => { valid: boolean; message?: string };
  editorClassName?: string;
  searchQuery?: string;
};

export const JsonContent = ({
  isEditMode,
  json,
  form,
  theme,
  editorClassName,
  searchQuery,
}: JsonContentProps) => {
  const isEmptyString = useMemo(() => {
    return typeof json === 'string' && json.trim() === '';
  }, [json]);

  if (isEditMode) {
    return (
      <Form {...form}>
        <form className="h-full">
          <FormField
            control={form.control}
            name="jsonContent"
            render={({ field }) => (
              <FormItem className="h-full">
                <FormControl className="h-full">
                  <CodeEditor
                    value={field.value}
                    placeholder={t('Paste sample data here')}
                    readonly={false}
                    theme={theme}
                    containerClassName={editorClassName}
                    onChange={(value) => {
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage className="ml-4 pb-1" />
              </FormItem>
            )}
          />
        </form>
      </Form>
    );
  }

  if (isNil(json)) {
    return (
      <pre className="text-sm whitespace-pre-wrap overflow-x-auto p-2 border-t">
        {json === null ? 'null' : 'undefined'}
      </pre>
    );
  }

  return (
    <div className="h-full">
      {typeof json !== 'string' && typeof json !== 'object' && (
        <pre className="text-sm whitespace-pre-wrap overflow-x-auto p-2 border-t">
          {JSON.stringify(json)}
        </pre>
      )}
      {isEmptyString && (
        <pre className="text-sm whitespace-pre-wrap overflow-x-auto p-2 border-t">
          {json}
        </pre>
      )}
      {(typeof json === 'object' ||
        (typeof json === 'string' && !isEmptyString)) && (
        <CodeEditor
          value={json}
          readonly={true}
          theme={theme}
          containerClassName={editorClassName}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
};
