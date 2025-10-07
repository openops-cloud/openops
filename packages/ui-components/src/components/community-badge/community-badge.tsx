import { t } from 'i18next';
import { Link } from 'react-router-dom';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

type CommunityBadgeProps = {
  link?: string;
  showUpgrade?: boolean;
};

const CommunityBadge = ({ link = '', showUpgrade }: CommunityBadgeProps) => {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger>
        <Badge
          variant="outline"
          className="h-6 flex items-center gap-1 py-0 bg-editorBackground"
        >
          <span className="text-primary text-[11px] font-normal">
            {t('Community')}
          </span>
          {showUpgrade && (
            <>
              <div className="h-full w-[1px] bg-border"></div>
              <Link
                to={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-200 text-[12px] font-base"
              >
                {t('Upgrade')}
              </Link>
            </>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-bold">
            {t('We’re glad to give back!')}
          </div>
          <div className="text-sm font-normal whitespace-pre-line">
            {t(
              'This open-source version is free to use.\n Want more power? Explore our paid plans.',
            )}
          </div>
          {link && (
            <Link
              to={link}
              target="_blank"
              rel="noopener noreferrer"
              className="self-center mt-3"
            >
              <Button size="sm">{t('See plans')}</Button>
            </Link>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export { CommunityBadge };
