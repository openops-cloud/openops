export function extractLanguageFromClassName(
  className?: string,
): string | undefined {
  if (!className) {
    return undefined;
  }

  const languagePrefix = 'language-';
  const languageIndex = className.indexOf(languagePrefix);

  if (languageIndex === -1) {
    return undefined;
  }

  const startIndex = languageIndex + languagePrefix.length;
  const remainingString = className.substring(startIndex);

  const language = remainingString.split(/\s/)[0];
  return language.length > 0 ? language : undefined;
}

export function applyVariables(
  markdown: string,
  variables: Record<string, string>,
) {
  return markdown
    .replaceAll('<br>', '\n')
    .replaceAll(/\{\{(.*?)\}\}/g, (_, variableName) => {
      return variables[variableName] ?? '';
    });
}
