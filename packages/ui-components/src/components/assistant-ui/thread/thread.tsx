import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from '@assistant-ui/react';
import {
  ArrowDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStopIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizontalIcon,
} from 'lucide-react';
import { FC, memo, useMemo } from 'react';
import { cn } from '../../../lib/cn';
import { Button } from '../../../ui/button';
import {
  AiModelSelector,
  AiModelSelectorProps,
} from '../../ai-chat-container/ai-model-selector';

import { t } from 'i18next';
import { Theme } from '../../../lib/theme';
import { GenerateCodeTool } from '../generate-code-tool/generate-code-tool';
import { MarkdownText } from '../markdown-text';
import { useThreadExtraContext } from '../thread-extra-context';
import { ToolFallback } from '../tool-fallback';
import { TooltipIconButton } from '../tooltip-icon-button';

const MarkdownTextWrapper = memo(({ theme, ...props }: any) => {
  const { codeVariation, handleInject } = useThreadExtraContext();
  return (
    <MarkdownText
      {...props}
      theme={theme}
      codeVariation={codeVariation}
      handleInject={handleInject}
    />
  );
});
MarkdownTextWrapper.displayName = 'MarkdownTextWrapper';

const AssistantMessageWrapper = memo(({ theme }: { theme: Theme }) => {
  return <AssistantMessage theme={theme} />;
});
AssistantMessageWrapper.displayName = 'AssistantMessageWrapper';

export type ThreadProps = {
  theme: Theme;
} & ComposerProps;

export const Thread = ({
  theme,
  availableModels,
  selectedModel,
  onModelSelected,
  isModelSelectorLoading,
}: ThreadProps) => {
  const messageComponents = useMemo(
    () => ({
      UserMessage: UserMessage,
      EditComposer: EditComposer,
      AssistantMessage: () => <AssistantMessageWrapper theme={theme} />,
    }),
    [theme],
  );
  return (
    <ThreadPrimitive.Root className="bg-background box-border flex h-full flex-col overflow-hidden">
      <ThreadPrimitive.Viewport className="flex h-full flex-col items-center overflow-y-auto scroll-smooth bg-inherit px-4 pt-8">
        <ThreadWelcome />

        <ThreadPrimitive.Messages components={messageComponents} />

        <ThreadPrimitive.If empty={false}>
          <div className="min-h-8 flex-grow" />
        </ThreadPrimitive.If>

        <div className="sticky bottom-0 mt-3 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end rounded-t-lg bg-inherit pb-4 z-20">
          <ThreadScrollToBottom />
          <Composer
            availableModels={availableModels}
            selectedModel={selectedModel}
            onModelSelected={onModelSelected}
            isModelSelectorLoading={isModelSelectorLoading}
          />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip={t('Scroll to bottom')}
        variant="outline"
        className="absolute -top-8 rounded-full disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  const { greeting } = useThreadExtraContext();

  return (
    <ThreadPrimitive.Empty>
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
        <div className="flex w-full h-full flex-grow flex-col items-center justify-center">
          <p className="mt-4 font-medium">{greeting}</p>
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
};

type ComposerProps = AiModelSelectorProps;

const Composer = ({
  availableModels,
  selectedModel,
  onModelSelected,
  isModelSelectorLoading,
}: ComposerProps) => {
  return (
    <ComposerPrimitive.Root className="relative focus-within:border-ring/20 flex w-full flex-wrap items-end rounded-lg border bg-inherit px-2.5 shadow-sm transition-colors ease-in pb-9">
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        placeholder={t('Write a message...')}
        className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
      />
      <ComposerAction />

      <AiModelSelector
        availableModels={availableModels}
        selectedModel={selectedModel}
        onModelSelected={onModelSelected}
        isModelSelectorLoading={isModelSelectorLoading}
        className="absolute left-3 bottom-3"
      />
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <SendHorizontalIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip={t('Cancel')}
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <CircleStopIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 [&:where(>*)]:col-start-2 w-full max-w-[var(--thread-max-width)] py-4">
      <UserActionBar />

      <div className="bg-muted text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 col-start-2 row-start-2">
        <MessagePrimitive.Content />
      </div>

      <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex flex-col items-end col-start-1 row-start-2 mr-3 mt-2.5"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip={t('Edit')}>
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="bg-muted my-4 flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 rounded-xl">
      <ComposerPrimitive.Input className="text-foreground flex h-8 w-full resize-none bg-transparent p-4 pb-0 outline-none" />

      <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost">{t('Cancel')}</Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button>{t('Send')}</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC<{ theme: Theme }> = ({ theme }) => {
  const messageComponents = useMemo(
    () => ({
      Text: (props: any) => <MarkdownTextWrapper {...props} theme={theme} />,
      tools: {
        Fallback: ToolFallback,
        by_name: {
          generate_code: (props: any) => (
            <GenerateCodeTool {...props} theme={theme} />
          ),
        },
      },
    }),
    [theme],
  );

  return (
    <MessagePrimitive.Root className="grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative w-full max-w-[var(--thread-max-width)] py-4">
      <div className="text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7 col-span-2 col-start-2 row-start-1 my-1.5">
        <MessagePrimitive.Content components={messageComponents} />
      </div>

      <AssistantActionBar />

      <BranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" />
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="text-muted-foreground flex gap-1 col-start-3 row-start-2 -ml-1 data-[floating]:bg-background data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip={t('Copy')}>
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip={t('Refresh')}>
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        'text-muted-foreground inline-flex items-center text-xs',
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip={t('Next')}>
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
