import { t } from 'i18next';
import { LayoutPanelTop, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import imageFile from '../../../static/images/no-workflows.svg';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { PermissionNeededTooltip } from '../../ui/permission-needed-tooltip';

type NoWorkflowsPlaceholderProps = {
  onExploreTemplatesClick: () => void;
  onNewWorkflowClick?: () => void;
};

enum Sizes {
  BIG = 'BIG',
  MEDIUM = 'MEDIUM',
  SMALL = 'SMALL',
}

const NoWorkflowsPlaceholder = ({
  onExploreTemplatesClick,
  onNewWorkflowClick,
}: NoWorkflowsPlaceholderProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<Sizes>(Sizes.MEDIUM);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight;
        if (height <= 170) {
          setContainerSize(Sizes.SMALL);
        } else if (height <= 390) {
          setContainerSize(Sizes.MEDIUM);
        } else {
          setContainerSize(Sizes.BIG);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-6 bg-background container"
    >
      {containerSize === Sizes.BIG && (
        <img
          src={imageFile}
          alt="no workflows placeholder"
          width="191px"
          height="159px"
          className="mb-[35px]"
        />
      )}
      <div className="flex flex-col gap-1">
        <h2 className="font-bold text-base text-foreground text-center">
          {t('No workflows created yet')}
        </h2>
        <p
          className={cn(
            'text-center font-normal text-foreground text-sm w-[442px]',
            {
              'w-auto': containerSize === Sizes.SMALL,
            },
          )}
        >
          {t(
            'Automate your FinOps processes, pick a template or start from scratch in order to see here your workflows stats',
          )}
        </p>
      </div>
      <div className="flex gap-6">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={onExploreTemplatesClick}
        >
          <LayoutPanelTop />
          {t('Explore templates')}
        </Button>
        {onNewWorkflowClick ? (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={onNewWorkflowClick}
          >
            <Plus />
            {t('New workflow')}
          </Button>
        ) : (
          <PermissionNeededTooltip>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus />
              {t('New workflow')}
            </Button>
          </PermissionNeededTooltip>
        )}
      </div>
    </div>
  );
};

NoWorkflowsPlaceholder.displayName = 'NoWorkflowsPlaceholder';
export { NoWorkflowsPlaceholder };
