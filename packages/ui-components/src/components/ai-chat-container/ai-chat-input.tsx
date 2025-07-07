import { UseChatHelpers } from '@ai-sdk/react';
import { Send as SendIcon } from 'lucide-react';
import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { AiModelSelector, AiModelSelectorProps } from './ai-model-selector';
import { AiScopeItem, AiScopeSelector } from './ai-scope-selector';

export enum ChatStatus {
  STREAMING = 'streaming',
  SUBMITTED = 'submitted',
  READY = 'ready',
  ERROR = 'error',
}

export type AiChatInputProps = {
  className?: string;
  placeholder?: string;
  status?: ChatStatus;
  scopeOptions?: AiScopeItem[];
  selectedScopeItems?: AiScopeItem[];
  onScopeSelected?: (scope: AiScopeItem) => void;
  onAiScopeItemRemove?: (id: string) => void;
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
  status,
  selectedScopeItems,
  onAiScopeItemRemove,
  scopeOptions,
  onScopeSelected,
}: AiChatInputProps) => {
  return (
    <div
      className={cn(
        'mx-4 py-2 pl-3 border-gray-200 border-[1px] rounded-lg',
        className,
      )}
    >
      {scopeOptions &&
        selectedScopeItems &&
        onScopeSelected &&
        onAiScopeItemRemove && (
          <AiScopeSelector
            options={scopeOptions}
            onScopeSelected={onScopeSelected}
            selectedItems={selectedScopeItems}
            onAiScopeItemRemove={onAiScopeItemRemove}
          />
        )}
      <div className="relative overflow-hidden">
        <ScrollArea
          className="h-full pr-12 py-2"
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
          className="absolute right-3 top-3 !p-0 size-5"
          onClick={handleSubmit}
          disabled={
            !!status &&
            [ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(status)
          }
        >
          <SendIcon size={20} className="text-gray-400 hover:text-gray-600" />
        </Button>
      </div>
      <AiModelSelector
        availableModels={availableModels}
        selectedModel={selectedModel}
        onModelSelected={onModelSelected}
        isModelSelectorLoading={isModelSelectorLoading}
      />
    </div>
  );
};

AiChatInput.displayName = 'AiChatInput';
