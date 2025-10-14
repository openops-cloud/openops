/**
 * Parses metadata from markdown code block className.
 * Supports attributes like h-150 in code blocks: ```graphql h-150
 */

export interface CodeBlockMetadata {
  height?: string;
}

/**
 * Extracts custom metadata from markdown code block className.
 *
 * @example
 * ```graphql h-150``` -> className="language-graphql", meta="h-150"
 * After concatenation: "language-graphql h-150"
 * parseCodeBlockMetadata("language-graphql h-150") -> { height: "150px" }
 *
 * Note: Height is passed directly to Monaco Editor's height prop.
 *
 * @param className The className from ReactMarkdown code component (with meta appended)
 * @returns Parsed metadata object with height in pixels
 */
export const parseCodeBlockMetadata = (
  className?: string,
): CodeBlockMetadata => {
  if (!className) {
    return {};
  }

  const metadata: CodeBlockMetadata = {};

  // Extract h-XXX pattern (e.g., h-150, h-200)
  const heightMatch = className.match(/\bh-(\d+)\b/);
  if (heightMatch) {
    const heightValue = heightMatch[1];
    metadata.height = `${heightValue}px`;
  }

  return metadata;
};
