import { UseChatHelpers } from '@ai-sdk/react';
import { Send as SendIcon } from 'lucide-react';
import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { AiModelSelector, AiModelSelectorProps } from './ai-model-selector';
import { AiScope, AiScopeProps } from './ai-scope';
import { AiScopeSelector, ScopeOption } from './ai-scope-selector';

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
  availableScopeOptions?: ScopeOption[];
  onScopeSelected?: (scope: ScopeOption) => void;
  isScopeSelectorLoading?: boolean;
} & Pick<UseChatHelpers, 'input' | 'handleInputChange' | 'handleSubmit'> &
  AiModelSelectorProps &
  AiScopeProps;

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
  aiScopeItems,
  onAiScopeItemRemove,
  availableScopeOptions = [],
  onScopeSelected,
  isScopeSelectorLoading = false,
}: AiChatInputProps) => {
  return (
    <div className={cn('w-full px-4', className)}>
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
          disabled={
            !!status &&
            [ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(status)
          }
        >
          <SendIcon size={20} className="text-gray-400 hover:text-gray-600" />
        </Button>
        {!!aiScopeItems?.length && (
          <ScrollArea className="p-3">
            <div className="flex flex-wrap gap-2 max-h-[52px]">
              <AiScope
                aiScopeItems={aiScopeItems}
                onAiScopeItemRemove={onAiScopeItemRemove}
              />
            </div>
          </ScrollArea>
        )}

        <div className="absolute left-3 bottom-3 flex gap-2 items-center h-[22px]">
          <AiScopeSelector
            availableScopeOptions={availableScopeOptions}
            onScopeSelected={onScopeSelected}
            isScopeSelectorLoading={isScopeSelectorLoading}
            className={className}
          />
          <AiModelSelector
            availableModels={availableModels}
            selectedModel={selectedModel}
            onModelSelected={onModelSelected}
            isModelSelectorLoading={isModelSelectorLoading}
          />
        </div>

        {/*<Select>*/}
        {/*  <SelectTrigger>*/}
        {/*    <Plus />*/}
        {/*  </SelectTrigger>*/}
        {/*  <SelectContent>*/}
        {/*    {contextOptions &&*/}
        {/*      contextOptions.map((context) => (*/}
        {/*        <SelectItem key={context.id} value={context.id}>*/}
        {/*          {context?.displayName}*/}
        {/*        </SelectItem>*/}
        {/*      ))}*/}
        {/*  </SelectContent>*/}
        {/*</Select>*/}
      </div>
    </div>
  );
};

AiChatInput.displayName = 'AiChatInput';
