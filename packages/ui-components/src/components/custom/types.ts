export enum MarkdownCodeVariations {
  WithoutCopy = 'without-copy',
  WithCopy = 'with-copy',
  WithCopyAndInject = 'with-copy-and-inject',
  WithCopyMultiline = 'with-copy-multiline',
}

export type CodeVariations = `${MarkdownCodeVariations}`;
