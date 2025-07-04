import { t } from 'i18next';
import { ChevronDown, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { Badge } from '../../ui/badge';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../../ui/command';
import { Input } from '../../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { ScrollArea } from '../../ui/scroll-area';
import { LoadingSpinner } from '../../ui/spinner';
import { AiScopeType } from './ai-scope';

export type ScopeOption = {
  id: string;
  displayName: string;
  type: AiScopeType;
};

export type AiScopeSelectorProps = {
  availableScopeOptions: ScopeOption[];
  onScopeSelected: (scope: ScopeOption) => void;
  isScopeSelectorLoading?: boolean;
  className?: string;
};

const AiScopeSelector = ({
  availableScopeOptions,
  onScopeSelected,
  isScopeSelectorLoading = false,
  className,
}: AiScopeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const hasOptions = availableScopeOptions.length > 0;
  const [filteredOptions, setFilteredOptions] = useState<ScopeOption[]>([]);

  // Track expanded/collapsed state for categories
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    [AiScopeType.STEP]: false,
    [AiScopeType.WORKFLOW]: false,
  });

  // Toggle category expanded/collapsed state
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  useEffect(() => {
    if (searchValue) {
      setFilteredOptions(
        availableScopeOptions.filter((scope) => {
          console.log(scope.displayName, searchValue);
          console.log(
            scope.displayName.toLowerCase().includes(searchValue.toLowerCase()),
          );
          return scope.displayName
            .toLowerCase()
            .includes(searchValue.toLowerCase());
        }),
      );
    } else {
      setFilteredOptions([...availableScopeOptions]);
    }
  }, [availableScopeOptions, searchValue]);

  // Group scope options by type and separate into categories and other options
  const { categorizedOptions, otherOptions } = useMemo(() => {
    const categorizedTypes = [AiScopeType.STEP, AiScopeType.WORKFLOW];
    const categorized: Record<string, ScopeOption[]> = {};
    const others: ScopeOption[] = [];

    availableScopeOptions.forEach((option) => {
      const type = option.type;
      if (categorizedTypes.includes(type as AiScopeType)) {
        if (!categorized[type]) {
          categorized[type] = [];
        }
        categorized[type].push(option);
      } else {
        others.push(option);
      }
    });

    return { categorizedOptions: categorized, otherOptions: others };
  }, [availableScopeOptions]);

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
    if (hasOptions && !isScopeSelectorLoading) {
      setOpen((open) => !open);
      setSearchValue('');
      setExpandedCategories({
        [AiScopeType.STEP]: false,
        [AiScopeType.WORKFLOW]: false,
      });
    }
  }, [hasOptions, isScopeSelectorLoading]);

  return (
    <div className={cn('relative', className)}>
      <Popover
        open={open && hasOptions && !isScopeSelectorLoading}
        onOpenChange={onOpenChange}
      >
        <PopoverTrigger asChild disabled={!hasOptions}>
          <div
            className={cn(
              'inline-flex items-center gap-1 cursor-pointer',
              !hasOptions && 'cursor-default',
            )}
          >
            <Badge
              variant="secondary"
              className="flex items-center gap-1 rounded-xs"
            >
              <Plus size={16} />
              {isScopeSelectorLoading && <LoadingSpinner size={12} />}
            </Badge>
          </div>
        </PopoverTrigger>
        {hasOptions && (
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command className="bg-background">
              <Input
                placeholder={t('Search scope...')}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <CommandList>
                <ScrollArea
                  className="h-full"
                  viewPortClassName={'max-h-[200px]'}
                >
                  {searchValue ? (
                    // When search is active, show all items in a flat list
                    <CommandGroup>
                      {filteredOptions.map((scope) => (
                        <CommandItem
                          key={scope.id}
                          value={scope.id}
                          onSelect={() => handleSelect(scope.id)}
                        >
                          {`${scope.type} ${scope.displayName}`}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : (
                    // When no search is active, show categorized view
                    <>
                      {/* Categorized options with collapsible headers */}
                      {Object.entries(categorizedOptions).map(
                        ([type, options]) => (
                          <div key={type}>
                            <div
                              className="flex items-center justify-between px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                              onClick={() => toggleCategory(type)}
                            >
                              <span>{t(type.toLowerCase())}</span>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform',
                                  expandedCategories[type] ? '' : '-rotate-90',
                                )}
                              />
                            </div>
                            {expandedCategories[type] && (
                              <CommandGroup>
                                {options.map((scope) => (
                                  <CommandItem
                                    key={scope.id}
                                    value={scope.id}
                                    onSelect={() => handleSelect(scope.id)}
                                  >
                                    {scope.displayName}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </div>
                        ),
                      )}

                      {/* Other options without categories */}
                      {otherOptions.length > 0 && (
                        <>
                          {Object.keys(categorizedOptions).length > 0 && (
                            <CommandSeparator />
                          )}
                          <CommandGroup>
                            {otherOptions.map((scope) => (
                              <CommandItem
                                key={scope.id}
                                value={scope.id}
                                onSelect={() => handleSelect(scope.id)}
                              >
                                {scope.displayName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </>
                  )}
                </ScrollArea>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
};

AiScopeSelector.displayName = 'AiScopeSelector';
export { AiScopeSelector };
