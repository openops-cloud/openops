import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type KnowledgeBaseCardProps = {
  link: string;
  text: string;
  icon: ReactNode;
  iconWrapperClassName?: string;
  className?: string;
};

const KnowledgeBaseCard = ({
  link,
  text,
  iconWrapperClassName,
  icon,
  className,
}: KnowledgeBaseCardProps) => {
  return (
    <a
      href={link}
      className={cn(
        'w-full h-[86px] min-w-[121px] py-2 px-2 flex flex-col gap-1 border rounded-sm bg-background overflow-hidden',
        className,
      )}
      aria-label={text}
    >
      <div
        className={cn(
          'min-w-6 h-6 w-6 flex items-center justify-center rounded-full bg-blue-300 text-background flex-shrink-0',
          iconWrapperClassName,
        )}
      >
        {icon}
      </div>
      <span className="font-normal text-sm text-foreground">{text}</span>
    </a>
  );
};

KnowledgeBaseCard.displayName = 'KnowledgeBaseCard';
export { KnowledgeBaseCard };
