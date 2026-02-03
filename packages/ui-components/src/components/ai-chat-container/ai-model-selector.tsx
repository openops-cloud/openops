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
import { LoadingSpinner } from '../../ui/spinner';
import { AiProviderIcon } from './ai-provider-icon';

type AiModelInfo = {
  name: string;
  provider?: string;
};

type AiModelSelectorProps = {
  selectedModel?: string;
  selectedProvider?: string;
  availableModels: AiModelInfo[];
  onModelSelected: (modelName: string) => void;
  isModelSelectorLoading: boolean;
  className?: string;
};

const AiModelSelector = ({
  selectedModel,
  selectedProvider,
  availableModels,
  onModelSelected,
  isModelSelectorLoading,
  className,
}: AiModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const hasOptions = availableModels.length > 1;

  const handleSelect = useCallback(
    (model: string) => {
      if (selectedModel !== model) {
        onModelSelected(model);
        setOpen(false);
      }
    },
    [onModelSelected, selectedModel],
  );

  const onOpenChange = useCallback(() => {
    if (hasOptions && !isModelSelectorLoading) {
      setOpen((open) => !open);
    }
  }, [hasOptions, isModelSelectorLoading]);

  return (
    <div className={cn('relative', className)}>
      <Popover
        open={open && hasOptions && !isModelSelectorLoading}
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
              <AiProviderIcon
                provider={selectedProvider}
                className="text-muted-foreground"
              />
              {selectedModel}
              {isModelSelectorLoading && <LoadingSpinner size={12} />}
              {hasOptions && !isModelSelectorLoading && (
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
                        key={model.name}
                        value={model.name}
                        onSelect={() => handleSelect(model.name)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <AiProviderIcon
                            provider={model.provider}
                            className="text-muted-foreground"
                          />
                          <span>{model.name}</span>
                        </div>
                        <Check
                          size={16}
                          className={cn(
                            'mr-2',
                            selectedModel === model.name
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
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
