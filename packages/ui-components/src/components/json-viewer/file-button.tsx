import { t } from 'i18next';
import { Eye, EyeOff } from 'lucide-react';
import React from 'react';
import { Button } from '../../ui/button';

type FileButtonProps = {
  fileUrl: string;
  handleDownloadFile: (fileUrl: string, ext?: string) => void;
};

export const FileButton = ({
  fileUrl,
  handleDownloadFile,
}: FileButtonProps) => {
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
