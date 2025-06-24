import { t } from 'i18next';
import { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UseFormReturn } from 'react-hook-form';
import { clipboardUtils } from '../../lib/clipboard-utils';
import { COPY_PASTE_TOAST_DURATION } from '../../lib/constants';
import { toast } from '../../ui/use-toast';
import { JsonFormValues } from './json-viewer';

const removeDoubleQuotes = (str: string): string =>
  str.startsWith('"') && str.endsWith('"') ? str.slice(1, -1) : str;

const isStepFileUrl = (json: unknown): json is string => {
  return (
    Boolean(json) &&
    typeof json === 'string' &&
    (json.startsWith('file://') || json.startsWith('"file://'))
  );
};

type UseJsonViewerProps = {
  json: any;
  title?: string;
  readonly?: boolean;
  onChange?: (json: any) => void;
  renderFileButton: (props: {
    fileUrl: string;
    isProductionFile: boolean;
    handleDownloadFile: (fileUrl: string, ext?: string) => void;
  }) => React.ReactNode;
  form: UseFormReturn<JsonFormValues, any, undefined>;
};

export const useJsonViewer = ({
  json,
  title,
  readonly = true,
  onChange,
  renderFileButton,
  form,
}: UseJsonViewerProps) => {
  const [isEditMode, setIsEditMode] = useState(!json && !readonly);

  const showCopySuccessToast = () =>
    toast({
      title: t('Copied to clipboard'),
      duration: COPY_PASTE_TOAST_DURATION,
    });

  const showCopyFailureToast = () =>
    toast({
      title: t('Failed to copy to clipboard'),
      duration: COPY_PASTE_TOAST_DURATION,
    });

  const handleCopy = () => {
    const text = JSON.stringify(json, null, 2);
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(showCopySuccessToast)
        .catch(showCopyFailureToast);
    } else {
      clipboardUtils.copyInInsecureContext({
        text,
        onSuccess: showCopySuccessToast,
        onError: showCopyFailureToast,
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    handleDownloadFile(url);
  };

  const handleDownloadFile = (fileUrl: string, ext = '') => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `${title}${ext}`;
    link.click();
    URL.revokeObjectURL(fileUrl);
  };

  const handleDelete = () => {
    setIsEditMode(true);
    form.reset({ jsonContent: undefined });
    if (onChange) {
      onChange(undefined);
    }
  };

  const apply = (json: string) => {
    if (onChange) {
      onChange(json);
    }
    setIsEditMode(false);
  };

  useLayoutEffect(() => {
    if (typeof json === 'object') {
      const stringValuesHTML = Array.from(
        document.getElementsByClassName('string-value'),
      );

      const stepFileUrlsHTML = stringValuesHTML.filter(
        (el) =>
          isStepFileUrl(el.innerHTML) ||
          isStepFileUrl(el.parentElement!.nextElementSibling?.innerHTML),
      );

      stepFileUrlsHTML.forEach((el: Element) => {
        const fileUrl = removeDoubleQuotes(el.innerHTML)
          .trim()
          .replace('\n', '');
        el.className += ' hidden';

        const rootElem = document.createElement('div');
        const root = createRoot(rootElem);

        el.parentElement!.replaceChildren(el as Node, rootElem as Node);
        const isProductionFile = fileUrl.startsWith('file://');

        root.render(
          renderFileButton({
            fileUrl,
            isProductionFile,
            handleDownloadFile,
          }),
        );
      });
    }
  });

  const isFileUrl = isStepFileUrl(json);

  return {
    handleCopy,
    handleDownload,
    handleDownloadFile,
    handleDelete,
    isFileUrl,
    isEditMode,
    setIsEditMode,
    readonly,
    apply,
  };
};
