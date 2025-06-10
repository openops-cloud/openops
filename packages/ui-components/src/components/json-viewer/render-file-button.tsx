import { t } from 'i18next';
import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import { FileButton } from './file-button';

type RenderFileButtonProps = {
  fileUrl: string;
  isProductionFile: boolean;
  handleDownloadFile: (fileUrl: string, ext?: string) => void;
};

export const renderFileButton = ({
  fileUrl,
  isProductionFile,
  handleDownloadFile,
}: RenderFileButtonProps) => (
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
      <FileButton fileUrl={fileUrl} handleDownloadFile={handleDownloadFile} />
    )}
  </div>
);
