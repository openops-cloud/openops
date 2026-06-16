import {
  EditableText,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@openops/components/ui';
import { t } from 'i18next';
import { InfoIcon, StarIcon } from 'lucide-react';
import { useRef } from 'react';
import { useFormContext } from 'react-hook-form';

import { SplitAction } from '@openops/shared';

type Props = {
  name: string;
  formInputName: `settings.options.${number}.name`;
  readonly: boolean;
  isDefault: boolean;
};

const MAX_WIDTH = 240;

const EditBranchName = ({
  name,
  formInputName,
  readonly,
  isDefault,
}: Props) => {
  const form = useFormContext<SplitAction>();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        `flex justify-between max-w-[${MAX_WIDTH}px] max-w-content`,
        {
          'pr-2 pt-2 w-full': isDefault,
        },
      )}
      data-testid={`edit-${formInputName}`}
    >
      <div className="flex items-center justify-center gap-1">
        {isDefault && (
          <DefaultBranchToolTip
            icon={<StarIcon className="w-4 h-4 mb-1" />}
            tooltipPosition="right"
          />
        )}
        <EditableText
          className={cn({
            'font-semibold': isDefault,
          })}
          value={name}
          onValueChange={(value) => {
            (form.setValue as (name: string, value: string) => void)(
              formInputName,
              value,
            );
          }}
          readonly={readonly}
          containerRef={containerRef}
          maxWidth={MAX_WIDTH}
          beforeIconSlot={
            isDefault && (
              <div className="text-muted-foreground">{t('(Default)')}</div>
            )
          }
        ></EditableText>
      </div>
      {isDefault && (
        <DefaultBranchToolTip
          icon={<InfoIcon className="mr-2 mt-1 w-4 h-4" />}
        />
      )}
    </div>
  );
};

const DefaultBranchToolTip = ({
  icon,
  tooltipPosition,
}: {
  icon: React.ReactNode;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{icon}</TooltipTrigger>
    <TooltipContent sideOffset={5} side={tooltipPosition}>
      <div className="flex flex-col gap-1">
        <div className="text-sm">{t('Default branch')}</div>
        <div className="text-xs text-muted-foreground">
          {t('The default is executed if none conditions match.')}
        </div>
      </div>
    </TooltipContent>
  </Tooltip>
);

EditBranchName.displayName = 'EditBranchName';
export { EditBranchName };
