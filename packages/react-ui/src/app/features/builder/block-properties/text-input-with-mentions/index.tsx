import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import Mention, { MentionNodeAttrs } from '@tiptap/extension-mention';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';
import { EditorContent, useEditor } from '@tiptap/react';

import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { flowHelper, isNil } from '@openops/shared';

import './tip-tap.css';

import { cn } from '@openops/components/ui';

import { useBuilderStateContext } from '../../builder-hooks';

import { useEffect } from 'react';
import { textMentionUtils } from './text-input-utils';

type TextInputWithMentionsProps = {
  className?: string;
  initialValue?: unknown;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};
const extensions = (placeholder?: string) => {
  return [
    Document,
    History,
    HardBreak,
    Placeholder.configure({
      placeholder,
    }),
    Paragraph.configure({
      HTMLAttributes: {},
    }),
    Text,
    Mention.configure({
      suggestion: {
        char: '',
      },
      deleteTriggerWithBackspace: true,
      renderHTML({ node }) {
        const mentionAttrs: MentionNodeAttrs =
          node.attrs as unknown as MentionNodeAttrs;
        return textMentionUtils.generateMentionHtmlElement(mentionAttrs);
      },
    }),
  ];
};

function convertToText(value: unknown): string {
  if (isNil(value)) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return JSON.stringify(value);
}

export const TextInputWithMentions = ({
  className,
  initialValue,
  onChange,
  disabled,
  placeholder,
}: TextInputWithMentionsProps) => {
  const steps = useBuilderStateContext((state) =>
    flowHelper.getAllSteps(state.flowVersion.trigger),
  );
  const stepsMetadata = blocksHooks
    .useStepsMetadata(steps)
    .map(({ data: metadata }, index) => {
      if (metadata) {
        return {
          ...metadata,
          stepDisplayName: steps[index].displayName,
        };
      }
      return undefined;
    });

  const setInsertMentionHandler = useBuilderStateContext(
    (state) => state.setInsertMentionHandler,
  );

  const insertMention = (propertyPath: string) => {
    const mentionNode = textMentionUtils.createMentionNodeFromText(
      `{{${propertyPath}}}`,
      steps,
      stepsMetadata,
    );
    editor?.chain().focus().insertContent(mentionNode).run();
  };
  const editor = useEditor(
    {
      editable: !disabled,
      extensions: extensions(placeholder),
      content: {
        type: 'doc',
        content: textMentionUtils.convertTextToTipTapJsonContent(
          convertToText(initialValue),
          steps,
          stepsMetadata,
        ),
      },
      editorProps: {
        attributes: {
          class: cn(
            className ??
              ' w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
            textMentionUtils.inputThatUsesMentionClass,
            {
              'cursor-not-allowed opacity-50': disabled,
            },
          ),
        },
      },
      onUpdate: ({ editor }) => {
        const editorContent = editor.getJSON();
        const textResult =
          textMentionUtils.convertTiptapJsonToText(editorContent);
        if (onChange) {
          onChange(textResult);
        }
      },
      onFocus: () => {
        setInsertMentionHandler(insertMention);
      },
    },
    [disabled],
  );

  useEffect(() => {
    if (editor && initialValue !== undefined) {
      const currentEditorJson = editor.getJSON();
      const currentEditorText =
        textMentionUtils.convertTiptapJsonToText(currentEditorJson);
      const newText = convertToText(initialValue);

      if (currentEditorText !== newText) {
        const newContent = {
          type: 'doc',
          content: textMentionUtils.convertTextToTipTapJsonContent(
            newText,
            steps,
            stepsMetadata,
          ),
        };
        editor.commands.setContent(newContent, false);
      }
    }
  }, [editor, initialValue, steps, stepsMetadata]);

  return <EditorContent editor={editor} />;
};
