import React from 'react';
import { cn } from '../../lib/cn';

export type MarkdownComponentsConfig = {
  textClassName?: string;
  listClassName?: string;
  linkClassName?: string;
};

export function createMarkdownComponents({
  textClassName,
  listClassName,
  linkClassName,
}: MarkdownComponentsConfig) {
  return {
    h1: ({ node, ...props }: any) => (
      <h1
        className="scroll-m-20 text-3xl font-bold tracking-tight mt-1"
        {...props}
      />
    ),
    h2: ({ node, ...props }: any) => (
      <h2
        className="scroll-m-20 text-2xl font-semibold tracking-tight mt-4"
        {...props}
      />
    ),
    h3: ({ node, ...props }: any) => (
      <h3
        className="scroll-m-20 text-xl font-semibold tracking-tight mt-2"
        {...props}
      />
    ),
    h4: ({ node, ...props }: any) => (
      <h4
        className="scroll-m-20 text-lg font-semibold tracking-tight mt-2"
        {...props}
      />
    ),
    h5: ({ node, ...props }: any) => (
      <h5
        className="scroll-m-20 text-base font-semibold tracking-tight mt-2"
        {...props}
      />
    ),
    h6: ({ node, ...props }: any) => (
      <h6
        className="scroll-m-20 text-sm font-semibold tracking-tight mt-2"
        {...props}
      />
    ),
    p: ({ node, ...props }: any) => (
      <p
        className={cn(
          'leading-7 mt-2 [&:not(:first-child)]:my-2',
          textClassName,
        )}
        {...props}
      />
    ),
    ul: ({ node, ...props }: any) => (
      <ul
        className={cn('my-2 ml-6 list-disc [&>li]:mt-2', listClassName)}
        {...props}
      />
    ),
    ol: ({ node, ...props }: any) => (
      <ol
        className={cn('my-6 ml-6 list-decimal [&>li]:mt-2', listClassName)}
        {...props}
      />
    ),
    li: ({ node, ...props }: any) => (
      <li className={cn(textClassName)} {...props} />
    ),
    a: ({ node, ...props }: any) => (
      <a
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'font-medium text-primary underline underline-offset-4',
          linkClassName,
        )}
        {...props}
      />
    ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote className="mt-6 border-l-2 pl-6 italic" {...props} />
    ),
    hr: ({ node, ...props }: any) => (
      <hr className="my-5 border-b" aria-hidden="true" {...props} />
    ),
    table: ({ node, ...props }: any) => (
      <table
        className="my-5 w-full border-separate border-spacing-0 overflow-y-auto"
        {...props}
      />
    ),
    th: ({ node, ...props }: any) => (
      <th
        className="bg-muted px-4 py-2 text-left font-bold first:rounded-tl-lg last:rounded-tr-lg [&[align=center]]:text-center [&[align=right]]:text-right"
        {...props}
      />
    ),
    td: ({ node, ...props }: any) => (
      <td
        className="border-b border-l px-4 py-2 text-left last:border-r [&[align=center]]:text-center [&[align=right]]:text-right"
        {...props}
      />
    ),
    tr: ({ node, ...props }: any) => (
      <tr
        className="m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
        {...props}
      />
    ),
  };
}
