import { Button, TooltipWrapper } from '@openops/components/ui';
import { t } from 'i18next';
import { ExpandIcon, MinimizeIcon, MinusIcon } from 'lucide-react';

export enum DataSelectorSizeState {
  EXPANDED = 'expanded',
  COLLAPSED = 'collapsed',
  DOCKED = 'docked',
}

type DataSelectorSizeTogglersPorps = {
  state: DataSelectorSizeState;
  setListSizeState: (state: DataSelectorSizeState) => void;
};

export const DataSelectorSizeTogglers = ({
  state,
  setListSizeState: setDataSelectorSizeState,
}: DataSelectorSizeTogglersPorps) => (
  <>
    <TooltipWrapper
      tooltipText={
        state === DataSelectorSizeState.EXPANDED ? t('Dock') : t('Expand')
      }
    >
      <Button
        size="icon"
        className="text-outline"
        onClick={(e) => {
          e.stopPropagation();

          if (state === DataSelectorSizeState.EXPANDED) {
            setDataSelectorSizeState(DataSelectorSizeState.DOCKED);
          } else {
            setDataSelectorSizeState(DataSelectorSizeState.EXPANDED);
          }
        }}
        variant="basic"
      >
        {state === DataSelectorSizeState.EXPANDED ? (
          <MinimizeIcon size={16} />
        ) : (
          <ExpandIcon size={16} />
        )}
      </Button>
    </TooltipWrapper>

    <TooltipWrapper tooltipText={t('Minimize')}>
      <Button
        size="icon"
        className="text-outline"
        onClick={(e) => {
          e.stopPropagation();
          setDataSelectorSizeState(DataSelectorSizeState.COLLAPSED);
        }}
        variant="basic"
      >
        <MinusIcon size={20}></MinusIcon>
      </Button>
    </TooltipWrapper>
  </>
);
