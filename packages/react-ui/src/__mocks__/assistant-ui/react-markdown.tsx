import React from 'react';

// Mock the react-markdown components
export const MarkdownTextPrimitive = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const CodeHeaderProps = {};

// Mock hooks
export const useIsMarkdownCodeBlock = () => false;
export const unstable_memoizeMarkdownComponents = () => ({});

export default {
  MarkdownTextPrimitive,
  CodeHeaderProps,
  useIsMarkdownCodeBlock,
  unstable_memoizeMarkdownComponents,
};
