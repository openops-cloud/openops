import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Tooltip, TooltipTrigger } from '../../ui/tooltip';

const SideMenuHeader = ({
  className,
  logo,
  children,
}: {
  className?: string;
  logo: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div
    className={cn(
      'w-full flex items-center px-6 py-[18px] h-[60px] flex-shrink-0 border-b',
      className,
    )}
  >
    <Link to="/">
      <Tooltip>
        <TooltipTrigger asChild>{logo}</TooltipTrigger>
      </Tooltip>
    </Link>
    {children}
  </div>
);

SideMenuHeader.displayName = 'SideMenuHeader';
export { SideMenuHeader };
