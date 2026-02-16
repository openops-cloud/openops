import { cva, type VariantProps } from 'class-variance-authority';
import { t } from 'i18next';
import { LucideBarChart2, Sparkles } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';

const finOpsBenchmarkBannerVariants = cva(
  'flex w-full items-center justify-between gap-4 rounded-[8px] border border-input bg-background-800 p-4',
  {
    variants: {
      variation: {
        default: '',
        report: '',
      },
    },
    defaultVariants: {
      variation: 'default',
    },
  },
);

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

const PROVIDER_LABELS: Record<string, string> = {
  aws: 'AWS',
  azure: 'Azure',
};

type FinOpsBenchmarkBannerProps = VariantProps<
  typeof finOpsBenchmarkBannerVariants
> & {
  provider?: 'aws' | 'azure';
  onActionClick?: () => void;
  onViewReportClick?: () => void;
  className?: string;
};

const FinOpsBenchmarkBanner = ({
  variation = 'default',
  provider = 'aws',
  onActionClick,
  onViewReportClick,
  className,
}: FinOpsBenchmarkBannerProps) => {
  const providerLabel = PROVIDER_LABELS[provider];

  const content =
    variation === 'report'
      ? {
          title: t('FinOps Benchmark'),
          description:
            t('Your') + ` ${providerLabel} ` + t('benchmark report is ready.'),
          actionLabel: t('Re-run a Benchmark'),
          reportLabel: t('See') + ` ${providerLabel} ` + t('Benchmark Report'),
        }
      : {
          title: t('FinOps Benchmark'),
          description: t(
            'Evaluate your current cloud spend and the potential improvement',
          ),
          actionLabel: t('Run a Benchmark'),
        };

  return (
    <div
      className={cn(finOpsBenchmarkBannerVariants({ variation }), className)}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-5 text-black dark:text-white">
          {content.title}
        </p>
        <p className="truncate text-sm font-normal leading-5 text-black dark:text-white">
          {content.description}
        </p>
      </div>
      <div className={finOpsActionsVariants({ variation })}>
        {variation === 'report' && (
          <Button
            type="button"
            variant="ghost"
            className="h-auto gap-1 px-0 py-0 text-sm font-bold leading-5 text-primary-200 hover:bg-transparent hover:underline"
            onClick={onViewReportClick}
          >
            <LucideBarChart2 className="size-[18px]" />
            {content.reportLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-[38px] gap-2 rounded-[8px] border-input bg-background px-3 py-[9px] text-sm font-bold leading-5 text-primary-200 hover:bg-accent/50"
          onClick={onActionClick}
        >
          <Sparkles className="size-5" />
          {content.actionLabel}
        </Button>
      </div>
    </div>
  );
};

FinOpsBenchmarkBanner.displayName = 'FinOpsBenchmarkBanner';

export { FinOpsBenchmarkBanner };
