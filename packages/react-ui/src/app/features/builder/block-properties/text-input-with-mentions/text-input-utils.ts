import { JSONContent } from '@tiptap/react';

import { StepMetadata } from '@openops/components/ui';
import {
  Action,
  Trigger,
  TriggerWithOptionalId,
  assertNotNullOrUndefined,
  isNil,
} from '@openops/shared';
import { DOMOutputSpec } from '@tiptap/pm/model';

type FlowStep = Action | Trigger | TriggerWithOptionalId;

const removeIntroplationBrackets = (text: string) => {
  return text.slice(2, text.length - 2);
};

const removeQuotes = (text: string) => {
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
};

const keysWithinPath = (path: string) => {
  return path
    .split(/\.|\[|\]/)
    .filter((key) => key && key !== '')
    .map((key) => removeQuotes(key));
};

export type MentionNodeAttrs = {
  id?: string;
  label?: string;
  logoUrl?: string;
  displayText: string;
  serverValue: string;
};

enum TipTapNodeTypes {
  paragraph = 'paragraph',
  text = 'text',
  hardBreak = 'hardBreak',
  mention = 'mention',
}
const isMentionNodeText = (item: string) => /^\{\{.*\}\}$/.test(item);

type ParseMentionNodeFromText = {
  path: string;
  stepDisplayName: string;
  stepLogoUrl: string;
  stepDfsIndex: number;
  startingIndex?: number;
};
function getLabelForMention({
  stepDisplayName,
  stepLogoUrl,
  stepDfsIndex,
  path,
  startingIndex = 0,
}: ParseMentionNodeFromText) {
  const keys = keysWithinPath(removeIntroplationBrackets(path));
  if (keys.length === 0) {
    return 'Custom Code';
  }
  const displayKeys = keys.slice(1).map((key) => {
    const num = Number(key);

    // Convert from 0-based to 1-based index for consistency with Data Selector
    return Number.isInteger(num) && key === num.toString()
      ? String(num + startingIndex + 1)
      : key;
  });
  const mentionText = [stepDisplayName, ...displayKeys].join(' ');
  return JSON.stringify({
    logoUrl: stepLogoUrl,
    displayText: `${stepDfsIndex}. ${mentionText}`,
    serverValue: path,
  });
}

function parseMentionNodeFromText(request: ParseMentionNodeFromText) {
  return {
    type: TipTapNodeTypes.mention,
    attrs: {
      id: request.path,
      label: getLabelForMention(request),
    },
  };
}

type StepMetadataWithDisplayName = StepMetadata & { stepDisplayName: string };
const getStepMetadataFromPath = (
  path: string,
  steps: FlowStep[],
  stepsMetadata: (StepMetadataWithDisplayName | undefined)[],
) => {
  const stepPath = removeIntroplationBrackets(path);
  const stepName = textMentionUtils.keysWithinPath(stepPath)[0];
  const index = steps.findIndex((step) => step.name === stepName);
  return {
    dfsIndex: index,
    stepMetadata: stepsMetadata[index],
  };
};

function convertTextToTipTapJsonContent(
  userInputText: string,
  steps: FlowStep[],
  stepsMetadata: (StepMetadataWithDisplayName | undefined)[],
): {
  type: TipTapNodeTypes.paragraph;
  content: JSONContent[];
}[] {
  const inputSplitToNodesContent = userInputText
    .split(/(\{\{.*?\}\})/)
    .map((el) => el.split(new RegExp(`(\n)`)))
    .flat(1)
    .filter((el) => el);
  return inputSplitToNodesContent.reduce(
    (result, node) => {
      if (node === '\n') {
        result.push({
          type: TipTapNodeTypes.paragraph,
          content: [],
        });
      } else if (isMentionNodeText(node)) {
        result[result.length - 1].content.push(
          createMentionNodeFromText(node, steps, stepsMetadata),
        );
      } else {
        result[result.length - 1].content.push({
          type: TipTapNodeTypes.text,
          text: node,
        });
      }
      return result;
    },
    [
      {
        content: [],
        type: TipTapNodeTypes.paragraph,
      },
    ] as {
      type: TipTapNodeTypes.paragraph;
      content: JSONContent[];
    }[],
  );
}

function createMentionNodeFromText(
  mention: string,
  steps: FlowStep[],
  stepsMetadata: (StepMetadataWithDisplayName | undefined)[],
) {
  const { stepMetadata, dfsIndex } = getStepMetadataFromPath(
    mention,
    steps,
    stepsMetadata,
  );
  return parseMentionNodeFromText({
    path: mention,
    stepDisplayName: stepMetadata?.stepDisplayName ?? '',
    stepLogoUrl: stepMetadata?.logoUrl ?? '',
    stepDfsIndex: dfsIndex + 1,
  });
}

function convertTiptapJsonToText(nodes: JSONContent[]): string {
  const res = nodes.map((node, index) => {
    switch (node.type) {
      case TipTapNodeTypes.hardBreak:
        return '\n';
      case TipTapNodeTypes.text: {
        return node.text ?? '';
      }
      case TipTapNodeTypes.mention: {
        return node.attrs?.label
          ? JSON.parse(node.attrs.label).serverValue
          : '';
      }
      case TipTapNodeTypes.paragraph: {
        return `${
          isNil(node.content) ? '' : convertTiptapJsonToText(node.content)
        }${index < nodes.length - 1 ? '\n' : ''}`;
      }
      default:
        return '';
    }
  });
  return res.join('');
}

const generateMentionHtmlElement = (
  mentionAttrs: MentionNodeAttrs,
): DOMOutputSpec => {
  const apMentionNodeAttrs: MentionNodeAttrs = JSON.parse(
    mentionAttrs.label || '{}',
  );
  assertNotNullOrUndefined(mentionAttrs.label, 'mentionAttrs.label');
  assertNotNullOrUndefined(mentionAttrs.id, 'mentionAttrs.id');
  assertNotNullOrUndefined(
    apMentionNodeAttrs.displayText,
    'apMentionNodeAttrs.displayText',
  );

  const attrs: Record<string, string> = {
    class:
      'inline-flex bg-muted/10 break-all my-1 mx-[1px] border border-[#9e9e9e] border-solid items-center gap-2 py-1 px-2 rounded-[3px] text-muted-foreground',
    'data-id': mentionAttrs.id,
    'data-label': mentionAttrs.label,
    'data-display-text': apMentionNodeAttrs.displayText,
    'data-type': TipTapNodeTypes.mention,
    contenteditable: 'false',
    servervalue: apMentionNodeAttrs.serverValue,
  };

  const children: DOMOutputSpec[] = [];
  if (apMentionNodeAttrs.logoUrl) {
    children.push([
      'img',
      { src: apMentionNodeAttrs.logoUrl, class: 'object-fit w-4 h-4' },
    ]);
  }

  // Text nodes are valid DOMOutputSpec children; newer @tiptap/pm types omit `string`.
  return [
    'span',
    attrs,
    ...children,
    apMentionNodeAttrs.displayText,
  ] as DOMOutputSpec;
};

const inputThatUsesMentionClass = 'ap-text-with-mentions';
export const textMentionUtils = {
  convertTextToTipTapJsonContent,
  convertTiptapJsonToText: ({ content }: JSONContent) => {
    const nodes = content ?? [];
    const res =
      nodes.length === 1 && isNil(nodes[0].content)
        ? ''
        : convertTiptapJsonToText(nodes);
    return res;
  },
  generateMentionHtmlElement,
  keysWithinPath,
  createMentionNodeFromText,
  inputThatUsesMentionClass,
};
