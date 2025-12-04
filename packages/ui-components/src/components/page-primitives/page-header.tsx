import { cn } from '../../lib/cn';
import { TOP_BAR_HEIGHT } from '../../lib/constants';

const PageHeader = ({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex items-center justify-between border-b w-full bg-background flex-shrink-0',
      className,
    )}
    style={{ height: `${TOP_BAR_HEIGHT}px` }}
  >
    <h1 className="text-2xl pl-7">{title}</h1>
    {children}
  </div>
);

PageHeader.displayName = 'PageHeader';
export { PageHeader };
