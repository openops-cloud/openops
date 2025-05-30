import { UseChatHelpers } from '@ai-sdk/react';
import { Send as SendIcon } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { AiModelSelector, AiModelSelectorProps } from './ai-model-selector';

export type AiChatInputProps = {
  className?: string;
  placeholder?: string;
} & Pick<UseChatHelpers, 'input' | 'handleInputChange' | 'handleSubmit'> &
  AiModelSelectorProps;

export const AiChatInput = ({
  input,
  handleInputChange,
  handleSubmit,
  availableModels,
  selectedModel,
  onModelSelected,
  isModelSelectorLoading,
  className,
  placeholder,
}: AiChatInputProps) => {
  return (
    <div className={cn(`w-full px-4 `, className)}>
      <div className="relative pt-1 pb-8 border-gray-200 border-[1px] rounded-lg overflow-hidden">
        <ScrollArea
          className="h-full p-3 pr-12"
          viewPortClassName={'max-h-[103px]'}
        >
          <TextareaAutosize
            className="w-full h-full min-h-6 resize-none dark:text-primary-700 text-base font-normal leading-normal outline-none dark:bg-transparent"
            placeholder={placeholder}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                ev.stopPropagation();
                handleSubmit();
              }
            }}
          />
        </ScrollArea>

        <Button
          size="icon"
          variant="transparent"
          className="absolute right-3 top-3"
          onClick={handleSubmit}
        >
          <SendIcon size={20} className="text-gray-400 hover:text-gray-600" />
        </Button>
        <AiModelSelector
          availableModels={availableModels}
          selectedModel={selectedModel}
          onModelSelected={onModelSelected}
          isModelSelectorLoading={isModelSelectorLoading}
          className="absolute left-3 bottom-3"
        />
      </div>
    </div>
  );
};

AiChatInput.displayName = 'AiChatInput';
