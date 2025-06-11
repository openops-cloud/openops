import { isNil } from '@openops/shared';
import { t } from 'i18next';
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import ReactJson from 'react-json-view';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '../../ui/form';
import { JsonEditor } from '../json-editor/json-editor';

type JsonFormValues = {
  jsonContent: string;
};

type JsonContentProps = {
  isEditMode: boolean;
  json: any;
  form: UseFormReturn<JsonFormValues>;
  theme?: string;
  validateJson?: (value: string) => { valid: boolean; message?: string };
};

export const JsonContent = ({
  isEditMode,
  json,
  form,
  theme,
}: JsonContentProps) => {
  const viewerTheme = theme === 'dark' ? 'pop' : 'rjv-default';

  if (isEditMode) {
    return (
      <Form {...form}>
        <form>
          <FormField
            control={form.control}
            name="jsonContent"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <JsonEditor
                    {...field}
                    placeholder={t('Paste sample data here')}
                    field={field as any}
                    readonly={false}
                    theme={theme}
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

  return (
    <div className="pt-[11px] pl-3 border-t border-solid">
      {isNil(json) ? (
        <pre className="text-sm whitespace-pre-wrap overflow-x-auto p-2">
          {json === null ? 'null' : 'undefined'}
        </pre>
      ) : (
        <>
          {typeof json !== 'string' && typeof json !== 'object' && (
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto p-2">
              {JSON.stringify(json)}
            </pre>
          )}
          {typeof json === 'string' && (
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto p-2">
              {json}
            </pre>
          )}
          {typeof json === 'object' && (
            <ReactJson
              style={{
                overflowX: 'auto',
              }}
              theme={viewerTheme}
              enableClipboard={false}
              groupArraysAfterLength={20}
              displayDataTypes={false}
              name={false}
              quotesOnKeys={false}
              src={json}
              collapsed={1}
              collapseStringsAfterLength={50}
            />
          )}
        </>
      )}
    </div>
  );
};
