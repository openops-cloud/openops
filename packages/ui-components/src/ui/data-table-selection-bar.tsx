'use client';

import { t } from 'i18next';
import { X } from 'lucide-react';
import React from 'react';

import { Button } from './button';

type DataTableSelectionBarProps = {
  selectedCount: number;
  onClearSelection: () => void;
  children: React.ReactNode;
};

export function DataTableSelectionBar({
  selectedCount,
  onClearSelection,
  children,
}: DataTableSelectionBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-background p-2 shadow-lg">
      <div className="flex items-center gap-2">
        {children}
        <div className="mx-1 h-6 border-l" />
        <span className="text-sm text-muted-foreground">
          {t('{count} selected', { count: selectedCount })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
