import { cn } from '../../lib/cn';

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
      'flex items-center justify-between border-b w-full bg-background h-[60px] flex-shrink-0',
      className,
    )}
  >
    <h1 className="text-2xl pl-7">{title}</h1>
    {children}
  </div>
);

PageHeader.displayName = 'PageHeader';
export { PageHeader };
