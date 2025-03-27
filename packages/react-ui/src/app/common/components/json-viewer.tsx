import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from '@openops/components/ui';
import { t } from 'i18next';
import { Copy, Download, Eye, EyeOff } from 'lucide-react';
import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ReactJson from 'react-json-view';

import { useTheme } from '@/app/common/providers/theme-provider';
import { isStepFileUrl } from '@/app/lib/utils';
import { isNil } from '@openops/shared';

type JsonViewerProps = {
  json: any;
  title: string;
};

type FileButtonProps = {
  fileUrl: string;
  handleDownloadFile: (fileUrl: string) => void;
};
const FileButton = ({ fileUrl, handleDownloadFile }: FileButtonProps) => {
  const readonly = fileUrl.includes('file://');
  return (
    <div className="flex items-center gap-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownloadFile(fileUrl)}
        className="flex items-center gap-2 p-2 max-h-[20px] text-xs"
      >
        {readonly ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
        {t('Download File')}
      </Button>
    </div>
  );
};

const removeDoubleQuotes = (str: string): string =>
  str.startsWith('"') && str.endsWith('"') ? str.slice(1, -1) : str;

const JsonViewer = React.memo(({ json, title }: JsonViewerProps) => {
  const { theme } = useTheme();

  const viewerTheme = theme === 'dark' ? 'pop' : 'rjv-default';
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    toast({
      title: t('Copied to clipboard'),
      duration: 1000,
    });
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
          <div data-file-root="true">
            {isProductionFile ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FileButton
                      fileUrl={fileUrl}
                      handleDownloadFile={handleDownloadFile}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t('File is not available after execution.')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <FileButton
                fileUrl={fileUrl}
                handleDownloadFile={handleDownloadFile}
              />
            )}
          </div>,
        );
      });
    }
  });

  if (isStepFileUrl(json)) {
    return (
      <FileButton fileUrl={json} handleDownloadFile={handleDownloadFile} />
    );
  }

  return (
    <div className="rounded-lg border border-solid border-dividers overflow-hidden">
      <div className="px-4 py-3 flex border-solid border-b border-dividers justfy-center items-center">
        <div className="flex-grow justify-center items-center">
          <span className="text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-0">
          <Button variant={'ghost'} size={'sm'} onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant={'ghost'} size={'sm'} onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {
        <>
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
                />
              )}
            </>
          )}
        </>
      }
    </div>
  );
});

JsonViewer.displayName = 'JsonViewer';
export { JsonViewer };
