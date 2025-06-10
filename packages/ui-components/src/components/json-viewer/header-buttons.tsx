import { t } from 'i18next';
import { Check, Copy, Download, Pencil, Trash } from 'lucide-react';
import React from 'react';
import { Button } from '../../ui/button';

type HeaderButtonsProps = {
  isEditMode: boolean;
  readonly: boolean;
  showDeleteButton: boolean;
  handleCopy: () => void;
  handleDownload: () => void;
  handleEdit: () => void;
  handleDelete: () => void;
  apply?: () => void;
};

export const HeaderButtons = ({
  isEditMode,
  readonly,
  showDeleteButton,
  handleCopy,
  handleDownload,
  handleEdit,
  handleDelete,
  apply,
}: HeaderButtonsProps) => {
  return (
    <div className="flex items-center gap-2">
      {isEditMode && apply ? (
        <Button variant={'ghost'} size={'sm'} onClick={apply}>
          <Check className="w-4 h-4 mr-[3px]" />
          {t('Apply')}
        </Button>
      ) : (
        <>
          {!readonly && (
            <>
              {showDeleteButton && (
                <Button variant={'ghost'} size={'sm'} onClick={handleDelete}>
                  <Trash className="w-4 h-4" />
                </Button>
              )}

              <Button variant={'ghost'} size={'sm'} onClick={handleEdit}>
                <Pencil className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant={'ghost'} size={'sm'} onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant={'ghost'} size={'sm'} onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
};
