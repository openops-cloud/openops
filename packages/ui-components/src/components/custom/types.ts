export enum MarkdownCodeVariations {
  WithoutCopy = 'without-copy',
  WithCopy = 'with-copy',
  WithCopyAndInject = 'with-copy-and-inject',
}

export type CodeVariations = `${MarkdownCodeVariations}`;
