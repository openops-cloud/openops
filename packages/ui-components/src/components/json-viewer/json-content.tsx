import { isNil } from '@openops/shared';
import { t } from 'i18next';
import { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { tryParseJson } from '../../lib/json-utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '../../ui/form';
import { ScrollArea } from '../../ui/scroll-area';
import { CodeMirrorEditor } from '../json-editor';

type JsonFormValues = {
  jsonContent: string;
};

type JsonContentProps = {
  isEditMode: boolean;
  json: any;
  form: UseFormReturn<JsonFormValues>;
  theme: string;
  validateJson?: (value: string) => { valid: boolean; message?: string };
  editorClassName?: string;
};

export const JsonContent = ({
  isEditMode,
  json,
  form,
  theme,
  editorClassName,
}: JsonContentProps) => {
  const isEmptyString = useMemo(() => {
    return typeof json === 'string' && json.trim() === '';
  }, [json]);

  if (isEditMode) {
    return (
      <Form {...form}>
        {/* <ScrollArea className="h-full overflow-hidden"> */}
        <form>
          <FormField
            control={form.control}
            name="jsonContent"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CodeMirrorEditor
                    value={field.value}
                    placeholder={t('Paste sample data here')}
                    readonly={false}
                    theme={theme}
                    containerClassName={editorClassName}
                    height="100%"
                    onChange={(value) => {
                      field.onChange(tryParseJson(value));
                    }}
                  />
                </FormControl>
                <FormMessage className="ml-4 pb-1" />
              </FormItem>
            )}
          />
        </form>
        {/* </ScrollArea> */}
      </Form>
    );
  }

  return (
    <ScrollArea className="h-full overflow-hidden">
      {isNil(json) ? (
        <pre className="text-sm whitespace-pre-wrap overflow-x-auto p-2 border-t">
          {json === null ? 'null' : 'undefined'}
        </pre>
      ) : (
        <>
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
            <CodeMirrorEditor
              value={json}
              readonly={true}
              theme={theme}
              containerClassName={editorClassName}
            />
          )}
        </>
      )}
    </ScrollArea>
  );
};
