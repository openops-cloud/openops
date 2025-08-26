import { t } from 'i18next';
import { Check, Copy, Download, Pencil, Search, Trash } from 'lucide-react';
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
  handleSearch?: () => void;
};

export const HeaderButtons = ({
  isEditMode,
  readonly,
  showDeleteButton,
  handleCopy,
  handleDownload,
  handleEdit,
  handleDelete,
  handleSearch,
  apply,
}: HeaderButtonsProps) => {
  return (
    <div className="flex items-center gap-0.5">
      {isEditMode && apply ? (
        <Button variant={'ghost'} className="p-2 h-8" onClick={apply}>
          <Check className="w-4 h-4 mr-[3px]" />
          {t('Apply')}
        </Button>
      ) : (
        <>
          {!readonly && (
            <>
              {showDeleteButton && (
                <Button
                  variant={'ghost'}
                  className="p-2 h-8"
                  onClick={handleDelete}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              )}

              <Button
                variant={'ghost'}
                className="p-2 h-8"
                onClick={handleEdit}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            variant={'ghost'}
            className="p-2 h-8"
            onClick={handleSearch}
            aria-label={t('Search')}
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant={'ghost'}
            className="p-2 h-8"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button variant={'ghost'} className="p-2 h-8" onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
};
