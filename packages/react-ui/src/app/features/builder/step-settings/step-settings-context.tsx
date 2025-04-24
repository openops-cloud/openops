import {
  ActionBase,
  BlockMetadataModel,
  TriggerBase,
} from '@openops/blocks-framework';
import { Action, Trigger } from '@openops/shared';
import { createContext, ReactNode, useContext } from 'react';

import { getStepTemplateModel } from './utils';

export type StepSettingsContextState = {
  selectedStep: Action | Trigger;
  selectedStepTemplateModel: ActionBase | TriggerBase | undefined;
  blockModel: BlockMetadataModel | undefined;
};

export type StepSettingsProviderProps = {
  selectedStep: Action | Trigger;
  blockModel: BlockMetadataModel | undefined;
  children: ReactNode;
};

const StepSettingsContext = createContext<StepSettingsContextState | undefined>(
  undefined,
);

export const StepSettingsProvider = ({
  selectedStep,
  blockModel,
  children,
}: StepSettingsProviderProps) => {
  const selectedStepTemplateModel = getStepTemplateModel(
    selectedStep,
    blockModel,
  );

  return (
    <StepSettingsContext.Provider
      value={{
        selectedStep,
        blockModel,
        selectedStepTemplateModel,
      }}
    >
      {children}
    </StepSettingsContext.Provider>
  );
};

export const useStepSettingsContext = () => {
  const context = useContext(StepSettingsContext);
  if (context === undefined) {
    throw new Error(
      'useBlockSettingsContext must be used within a BlockSettingsProvider',
    );
  }
  return context;
};
