import { t } from 'i18next';
import { Paperclip, Search, X } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { Badge } from '../../ui/badge';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../../ui/command';
import { Input } from '../../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { ScrollArea } from '../../ui/scroll-area';
import { BlockIcon } from '../block-icon';

export enum AiScopeType {
  STEP = 'STEP',
}

export type AiScopeItem = {
  displayName: string;
  logoUrl: string;
  displayIcon?: string;
  id: string;
  type: AiScopeType;
};

export type AiScopeSelectorProps = {
  options: AiScopeItem[];
  selectedItems: AiScopeItem[];
  onScopeSelected: (scope: AiScopeItem) => void;
  onAiScopeItemRemove?: (id: string) => void;
  className?: string;
};

const AiScopeBadge = ({
  item,
  onRemove,
}: {
  item: AiScopeItem;
  onRemove: (id: string) => void;
}) => {
  return (
    <Badge
      variant="outline"
      className="flex items-center gap-2 px-1 rounded-xs overflow-hidden"
    >
      <BlockIcon
        logoUrl={item.logoUrl}
        displayIcon={item.displayIcon}
        displayName={item.displayName}
        showTooltip={false}
        size={'sm'}
        className="size-[14px]"
      ></BlockIcon>
      <span className="flex-1 font-normal truncate text-[14px]">
        {item.displayName}
      </span>
      <X
        className="size-[13px] opacity-50"
        role="button"
        onClick={() => onRemove(item.id)}
      />
    </Badge>
  );
};

const AiScopeSelector = ({
  options,
  onScopeSelected,
  selectedItems = [],
  onAiScopeItemRemove,
  className,
}: AiScopeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredOptions = useMemo(() => {
    const availableOptions = options.filter(
      (option) => !selectedItems.some((item) => item.id === option.id),
    );

    if (searchValue) {
      return availableOptions.filter((scope) => {
        return scope.displayName
          .toLowerCase()
          .includes(searchValue.toLowerCase());
      });
    } else {
      return availableOptions;
    }
  }, [options, searchValue, selectedItems]);

  const handleSelect = useCallback(
    (scopeId: string) => {
      const selectedScope = options.find((scope) => scope.id === scopeId);
      if (selectedScope) {
        onScopeSelected(selectedScope);
      }
    },
    [options, onScopeSelected],
  );

  const onOpenChange = useCallback(() => {
    setOpen((open) => !open);
    setSearchValue('');
  }, []);

  const showSelectedItems =
    selectedItems && selectedItems.length > 0 && onAiScopeItemRemove;

  return (
    <div className="flex flex-col gap-2 relative">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          disabled={!filteredOptions.length}
          className={className}
        >
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1 rounded-xs text-xs font-medium cursor-pointer w-fit',
              { 'cursor-default': !filteredOptions.length },
            )}
          >
            {t('Add step context...')}
            <Paperclip size={13} />
          </Badge>
        </PopoverTrigger>

        <PopoverContent className="w-fit p-0" align="start" side="top">
          <Command className="bg-background">
            <div className={`relative mx-2 my-[6px] w-[190px]`}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder={t('Search')}
                className={cn(
                  'h-7 pl-9 pr-4 bg-background focus-visible:ring-0 focus-visible:ring-offset-0 rounded-sm',
                )}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            <CommandList>
              <ScrollArea
                className="h-full"
                viewPortClassName={'max-h-[114px] max-w-[200px]'}
              >
                <CommandGroup>
                  {filteredOptions.map((scope) => (
                    <CommandItem
                      key={scope.id}
                      value={scope.id}
                      onSelect={() => handleSelect(scope.id)}
                      className="w-full h-[27px] flex items-center justify-start gap-2 pl-1"
                    >
                      <BlockIcon
                        logoUrl={scope.logoUrl}
                        displayIcon={scope.displayIcon}
                        displayName={scope.displayName}
                        showTooltip={false}
                        size={'sm'}
                        className="size-4"
                      ></BlockIcon>
                      <span className="flex-1 truncate text-xs">
                        {scope.displayName}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showSelectedItems && (
        <ScrollArea viewPortClassName="max-h-[82px]">
          <div className="flex-1 flex flex-wrap gap-2 mr-3">
            {selectedItems.map((item) => (
              <AiScopeBadge
                key={item.id}
                item={item}
                onRemove={onAiScopeItemRemove}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

AiScopeSelector.displayName = 'AiScopeSelector';
export { AiScopeSelector };
