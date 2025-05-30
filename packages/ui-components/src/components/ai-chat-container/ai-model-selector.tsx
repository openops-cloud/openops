import { t } from 'i18next';
import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useState } from 'react';
import { cn } from '../../lib/cn';
import { Badge } from '../../ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { ScrollArea } from '../../ui/scroll-area';

type AiModelSelectorProps = {
  selectedModel: string;
  availableModels: string[];
  onModelSelected: (modelName: string) => void;
  className?: string;
};

const AiModelSelector = ({
  selectedModel,
  availableModels,
  onModelSelected,
  className,
}: AiModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const hasOptions = availableModels.length > 1;

  const handleSelect = useCallback(
    (value: string) => {
      onModelSelected(value);
      setOpen(false);
    },
    [onModelSelected],
  );

  return (
    <div className={cn('relative', className)}>
      <Popover open={open && hasOptions} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={!hasOptions}>
          <div
            className={cn(
              'inline-flex items-center gap-1 cursor-pointer',
              !hasOptions && 'cursor-default',
            )}
            onClick={() => {
              if (hasOptions) {
                setOpen(!open);
              }
            }}
          >
            <Badge
              variant="secondary"
              className="flex items-center gap-1 rounded-xs"
            >
              {selectedModel}
              {hasOptions && (
                <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
              )}
            </Badge>
          </div>
        </PopoverTrigger>
        {hasOptions && (
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command className="bg-background">
              <CommandInput placeholder={t('Search model...')} />
              <CommandList>
                <CommandEmpty>{t('No model found')}</CommandEmpty>
                <CommandGroup>
                  <ScrollArea
                    className="h-full"
                    viewPortClassName={'max-h-[200px]'}
                  >
                    {availableModels.map((model) => (
                      <CommandItem
                        key={model}
                        value={model}
                        onSelect={() => handleSelect(model)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedModel === model
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        {model}
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
};

AiModelSelector.displayName = 'AiModelSelector';
export { AiModelSelector, AiModelSelectorProps };
