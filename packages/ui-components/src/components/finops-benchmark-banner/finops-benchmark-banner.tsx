import { BenchmarkProviders } from '@openops/shared';
import { cva } from 'class-variance-authority';
import { t } from 'i18next';
import { LucideBarChart2, Sparkles } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { usePermissionMessage } from '../../ui/permission-message-context';
import { TooltipWrapper } from '../tooltip-wrapper';

const finOpsBenchmarkBannerClasses =
  'flex w-full items-center justify-between gap-4 rounded-[8px] border border-input bg-background-800 p-4';

const finOpsActionsVariants = cva('flex shrink-0 items-center', {
  variants: {
    variation: {
      default: 'gap-0',
      report: 'gap-[27px]',
    },
  },
  defaultVariants: {
    variation: 'default',
  },
});

const PROVIDER_LABELS: Record<BenchmarkProviders, string> = {
  [BenchmarkProviders.AWS]: 'AWS',
  [BenchmarkProviders.AZURE]: 'Azure',
};

type FinOpsBenchmarkBannerProps = {
  variation?: 'default' | 'report';
  providers?: BenchmarkProviders[];
  onActionClick?: () => void;
  onViewReportClick?: (provider: BenchmarkProviders) => void;
  className?: string;
  disabled?: boolean;
};

const FinOpsBenchmarkBanner = ({
  variation = 'default',
  providers = [BenchmarkProviders.AWS],
  onActionClick,
  onViewReportClick,
  className,
  disabled = false,
}: FinOpsBenchmarkBannerProps) => {
  const permissionMessage = usePermissionMessage();
  const disabledTooltip = disabled ? permissionMessage : undefined;

  const content =
    variation === 'report'
      ? {
          title: t('FinOps Benchmark'),
          description:
            providers.length > 1
              ? t('Your benchmark reports are ready.')
              : t('Your') +
                ` ${PROVIDER_LABELS[providers[0]]} ` +
                t('benchmark report is ready.'),
          actionLabel: t('Re-run a Benchmark'),
        }
      : {
          title: t('FinOps Benchmark'),
          description: t(
            'Evaluate your current cloud spend and the potential improvement',
          ),
          actionLabel: t('Run a Benchmark'),
        };

  return (
    <div className={cn(finOpsBenchmarkBannerClasses, className)}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-5 text-black dark:text-white">
          {content.title}
        </p>
        <p className="truncate text-sm font-normal leading-5 text-black dark:text-white">
          {content.description}
        </p>
      </div>
      <div className={finOpsActionsVariants({ variation })}>
        {variation === 'report' &&
          providers.map((provider) => (
            <TooltipWrapper key={provider} tooltipText={disabledTooltip}>
              <span className={cn({ 'cursor-not-allowed': disabled })}>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled}
                  className="h-auto gap-1 px-0 py-0 text-sm font-bold leading-5 text-primary-200 hover:bg-transparent hover:underline disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => onViewReportClick?.(provider)}
                >
                  <LucideBarChart2 className="size-[18px]" />
                  {t('See') +
                    ` ${PROVIDER_LABELS[provider]} ` +
                    t('Benchmark Report')}
                </Button>
              </span>
            </TooltipWrapper>
          ))}
        <TooltipWrapper tooltipText={disabledTooltip}>
          <span className={cn({ 'cursor-not-allowed': disabled })}>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="h-[38px] gap-2 rounded-[8px] border-input bg-background px-3 py-[9px] text-sm font-bold leading-5 text-primary-200 hover:bg-accent/50 disabled:pointer-events-none"
              onClick={onActionClick}
            >
              <Sparkles className="size-5" />
              {content.actionLabel}
            </Button>
          </span>
        </TooltipWrapper>
      </div>
    </div>
  );
};

FinOpsBenchmarkBanner.displayName = 'FinOpsBenchmarkBanner';

export { FinOpsBenchmarkBanner };
