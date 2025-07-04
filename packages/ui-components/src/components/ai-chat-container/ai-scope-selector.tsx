import { t } from 'i18next';
import { Paperclip, Plus, Search } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { BlockIcon, SearchInput } from '../../components';
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
import { AiScopeType } from './ai-scope';

export type ScopeOption = {
  id: string;
  displayName: string;
  type: AiScopeType;
};

export type AiScopeSelectorProps = {
  availableScopeOptions: ScopeOption[];
  onScopeSelected: (scope: ScopeOption) => void;
  className?: string;
};

const AiScopeSelector = ({
  availableScopeOptions,
  onScopeSelected,
  className,
}: AiScopeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const hasOptions = !!availableScopeOptions?.length;
  const [filteredOptions, setFilteredOptions] = useState<ScopeOption[]>([]);

  useEffect(() => {
    if (searchValue) {
      setFilteredOptions(
        availableScopeOptions.filter((scope) => {
          return scope.displayName
            .toLowerCase()
            .includes(searchValue.toLowerCase());
        }),
      );
    } else {
      setFilteredOptions([...availableScopeOptions]);
    }
  }, [availableScopeOptions, searchValue]);

  const handleSelect = useCallback(
    (scopeId: string) => {
      const selectedScope = availableScopeOptions.find(
        (scope) => scope.id === scopeId,
      );
      if (selectedScope) {
        onScopeSelected(selectedScope);
      }
    },
    [availableScopeOptions, onScopeSelected],
  );

  const onOpenChange = useCallback(() => {
    if (hasOptions) {
      setOpen((open) => !open);
      setSearchValue('');
    } else {
      setOpen(false);
    }
  }, [hasOptions]);

  if (!hasOptions) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger>
          <Badge
            variant="secondary"
            className="flex items-center gap-1 rounded-xs text-xs font-medium cursor-pointer"
          >
            {t('Add step context...')}
            <Paperclip size={13} />
          </Badge>
        </PopoverTrigger>

        <PopoverContent className="w-fit p-0" align="start">
          <Command className="bg-background">
            <div className={`relative mx-2 my-[6px] w-[190px]`}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('Search')}
                className={cn('pl-9 pr-4 bg-background')}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            <CommandList>
              <ScrollArea
                className="h-full"
                viewPortClassName={'max-h-[200px] max-w-[190px]'}
              >
                <CommandGroup>
                  {filteredOptions.map((scope) => (
                    <CommandItem
                      key={scope.id + scope.displayName}
                      value={scope.id}
                      onSelect={() => handleSelect(scope.id)}
                      className="h-[27px] pl-1 truncate"
                    >
                      <BlockIcon
                        logoUrl={scope.displayName}
                        displayName={scope.displayName}
                        showTooltip={false}
                        size={'sm'}
                      ></BlockIcon>
                      {scope.displayName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

AiScopeSelector.displayName = 'AiScopeSelector';
export { AiScopeSelector };
