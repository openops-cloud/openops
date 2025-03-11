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
        'w-full h-[78px] min-w-[170px] py-[23px] pl-4 pr-2 flex items-center gap-3 border rounded-sm bg-background',
        className,
      )}
      aria-label={text}
    >
      <div
        className={cn(
          'min-w-8 w-8 h-8 flex items-center justify-center rounded-full bg-blue-300 text-background',
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
