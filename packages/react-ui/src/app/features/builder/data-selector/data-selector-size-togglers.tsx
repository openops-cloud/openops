import { Button, cn } from '@openops/components/ui';
import { ExpandIcon, MinusIcon, PanelRightDashedIcon } from 'lucide-react';

export enum DataSelectorSizeState {
  EXPANDED,
  COLLAPSED,
  DOCKED,
}

type DataSelectorSizeTogglersPorps = {
  state: DataSelectorSizeState;
  setListSizeState: (state: DataSelectorSizeState) => void;
};

export const DataSelectorSizeTogglers = ({
  state,
  setListSizeState: setDataSelectorSizeState,
}: DataSelectorSizeTogglersPorps) => {
  const handleClick = (newState: DataSelectorSizeState) => {
    setDataSelectorSizeState(newState);
  };

  const buttonClassName = (btnState: DataSelectorSizeState) =>
    cn('', {
      'text-outline': state === btnState,
      'text-outline opacity-50 hover:opacity-100': state !== btnState,
    });

  return (
    <>
      <Button
        size="icon"
        className={buttonClassName(DataSelectorSizeState.EXPANDED)}
        onClick={() => handleClick(DataSelectorSizeState.EXPANDED)}
        variant="basic"
      >
        <ExpandIcon></ExpandIcon>
      </Button>
      <Button
        size="icon"
        className={buttonClassName(DataSelectorSizeState.DOCKED)}
        onClick={() => handleClick(DataSelectorSizeState.DOCKED)}
        variant="basic"
      >
        <PanelRightDashedIcon></PanelRightDashedIcon>
      </Button>
      <Button
        size="icon"
        className="text-outline opacity-50 hover:opacity-100"
        onClick={() => handleClick(DataSelectorSizeState.COLLAPSED)}
        variant="basic"
      >
        <MinusIcon></MinusIcon>
      </Button>
    </>
  );
};
