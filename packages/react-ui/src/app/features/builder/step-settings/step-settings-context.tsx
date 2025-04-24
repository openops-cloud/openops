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
  readonly: boolean;
};

export type StepSettingsProviderProps = {
  selectedStep: Action | Trigger;
  blockModel: BlockMetadataModel | undefined;
  readonly: boolean;
  children: ReactNode;
};

export const StepSettingsContext = createContext<
  StepSettingsContextState | undefined
>(undefined);

export const StepSettingsProvider = ({
  selectedStep,
  blockModel,
  readonly,
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
        readonly,
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
