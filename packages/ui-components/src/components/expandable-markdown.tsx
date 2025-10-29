import { ChevronDown, ChevronUp } from 'lucide-react';
import { ReactNode, useState } from 'react';

type ExpandableContentProps = {
  fullContent: string;
  truncatedContent?: string;
  children: (content: string) => ReactNode;
  className?: string;
  buttonClassName?: string;
};

const truncateAtFirstSentence = (text: string) => {
  const firstSentenceEnd = text.indexOf('.');
  if (firstSentenceEnd === -1) return text;
  return text.substring(0, firstSentenceEnd + 1);
};

export const ExpandableContent = ({
  fullContent,
  truncatedContent,
  children,
  className = '',
  buttonClassName = '',
}: ExpandableContentProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const truncated = truncatedContent || truncateAtFirstSentence(fullContent);
  const shouldShowToggle = truncated.length < fullContent.length;

  const defaultAlertClass =
    'relative w-full border pl-4 pb-2 pr-4 flex flex-col gap-2 bg-background text-foreground rounded-[5px] text-xs font-normal';

  const defaultButtonClass =
    'self-start text-xs text-primary-200 font-medium focus:outline-none';

  if (!shouldShowToggle) {
    return (
      <div className={`${defaultAlertClass} ${className}`}>
        {children(fullContent)}
      </div>
    );
  }

  return (
    <div className={`${defaultAlertClass} ${className}`}>
      {children(isExpanded ? fullContent : truncated)}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${defaultButtonClass} ${buttonClassName}`}
      >
        {isExpanded ? (
          <>
            Show less <ChevronUp className="inline w-4 h-4" />
          </>
        ) : (
          <>
            Show more <ChevronDown className="inline w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};
