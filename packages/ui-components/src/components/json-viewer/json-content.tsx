import { isNil } from '@openops/shared';
import { t } from 'i18next';
import { UseFormReturn } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '../../ui/form';
import { JsonEditor } from '../json-editor';

type JsonFormValues = {
  jsonContent: string;
};

type JsonContentProps = {
  isEditMode: boolean;
  json: any;
  form: UseFormReturn<JsonFormValues>;
  theme?: string;
  validateJson?: (value: string) => { valid: boolean; message?: string };
  editorClassName?: string;
};

const isEmptyString = (value: any): boolean => {
  return typeof value === 'string' && value.trim() === '';
};

export const JsonContent = ({
  isEditMode,
  json,
  form,
  theme,
  editorClassName,
}: JsonContentProps) => {
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
                    containerClassName={editorClassName}
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
    <div className="">
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
          {isEmptyString(json) && (
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto p-2">
              {json}
            </pre>
          )}
          {(typeof json === 'object' ||
            (typeof json === 'string' && !isEmptyString(json))) && (
            <div className="overflow-auto">
              <JsonEditor
                field={{ value: json }}
                readonly={true}
                theme={theme}
                containerClassName={editorClassName}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
