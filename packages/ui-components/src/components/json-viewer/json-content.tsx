import { json as jsonLang } from '@codemirror/lang-json';
import { isNil } from '@openops/shared';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror from '@uiw/react-codemirror';
import { t } from 'i18next';
import { UseFormReturn } from 'react-hook-form';
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
  editorClassName?: string;
};

export const JsonContent = ({
  isEditMode,
  json,
  form,
  theme,
  editorClassName,
}: JsonContentProps) => {
  const codeEditiorTheme = theme === 'dark' ? githubDark : githubLight;

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
          {(typeof json === 'object' || typeof json === 'string') && (
            <div className="overflow-auto">
              <CodeMirror
                editable={false}
                readOnly={true}
                value={json}
                className="border-none"
                height="250px"
                width="100%"
                maxWidth="100%"
                basicSetup={{
                  foldGutter: true,
                  highlightActiveLineGutter: true,
                  lineNumbers: true,
                }}
                lang="json"
                theme={codeEditiorTheme}
                extensions={[jsonLang()]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
