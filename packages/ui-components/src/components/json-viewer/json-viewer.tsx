import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FileButton } from './file-button';
import { HeaderButtons } from './header-buttons';
import { JsonContent } from './json-content';
import { useJsonViewer } from './json-viewer-hook';
import { renderFileButton } from './render-file-button';

type JsonViewerProps = {
  json: any;
  title: string;
  readonly?: boolean;
  onChange?: (json: any) => void;
  theme?: string;
};

type JsonFormValues = {
  jsonContent: string;
};

const JsonViewer = React.memo(
  ({ json, title, readonly = true, onChange, theme }: JsonViewerProps) => {
    const form = useForm<JsonFormValues>({
      defaultValues: {
        jsonContent: json,
      },
      mode: 'onChange',
    });

    useEffect(() => {
      form.reset({
        jsonContent: json,
      });
    }, [json, form]);

    const {
      handleCopy,
      handleDownload,
      handleDownloadFile,
      isFileUrl,
      isEditMode,
      setIsEditMode,
      apply,
    } = useJsonViewer({ json, title, readonly, renderFileButton, onChange });

    if (isFileUrl) {
      return (
        <FileButton fileUrl={json} handleDownloadFile={handleDownloadFile} />
      );
    }

    return (
      <div className="rounded-lg border border-solid border-dividers">
        <div className="px-4 py-3 flex border-solid border-b border-dividers justfy-center items-center">
          <div className="flex-grow justify-center items-center">
            <span className="text-sm">{title}</span>
          </div>
          <HeaderButtons
            isEditMode={isEditMode}
            readonly={readonly}
            handleCopy={handleCopy}
            handleDownload={handleDownload}
            handleEdit={() => setIsEditMode(true)}
            handleDelete={() => {
              onChange && onChange(undefined);
            }}
            apply={() => {
              apply(form.getValues('jsonContent'));
            }}
          />
        </div>

        <JsonContent
          isEditMode={isEditMode}
          json={json}
          form={form}
          theme={theme}
        />
      </div>
    );
  },
);

JsonViewer.displayName = 'JsonViewer';
export { JsonViewer };
