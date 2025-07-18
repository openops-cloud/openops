import React from 'react';

// Mock all the assistant-ui components as simple divs
export const ActionBarPrimitive = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const BranchPickerPrimitive = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const ComposerPrimitive = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const MarkdownTextPrimitive = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const ThreadPrimitive = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const ThreadWelcomeSuggestionsPrimitive = ({
  children,
  ...props
}: any) => <div {...props}>{children}</div>;

// Mock hooks
export const useIsMarkdownCodeBlock = () => false;
export const unstable_memoizeMarkdownComponents = () => ({});

// Mock any other exports
export default {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MarkdownTextPrimitive,
  ThreadPrimitive,
  ThreadWelcomeSuggestionsPrimitive,
  useIsMarkdownCodeBlock,
  unstable_memoizeMarkdownComponents,
};
