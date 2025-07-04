import { Action, Trigger } from '@openops/shared';
import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { MidpanelAction, MidpanelState } from '../../builder-types';

interface UseApplyCodeToInjectProps {
  form: UseFormReturn<Action | Trigger>;
  midpanelState: MidpanelState;
  applyMidpanelAction: (midpanelAction: MidpanelAction) => void;
}

export const useApplyCodeToInject = ({
  form,
  midpanelState,
  applyMidpanelAction,
}: UseApplyCodeToInjectProps) => {
  useEffect(() => {
    if (
      !midpanelState.codeToInject ||
      !midpanelState.aiChatProperty?.inputName
    ) {
      return;
    }

    switch (midpanelState.aiChatProperty.inputName) {
      case 'settings.sourceCode':
        form.setValue(
          midpanelState.aiChatProperty.inputName,
          {
            code: midpanelState.codeToInject,
            packageJson: '{}',
          },
          { shouldValidate: true },
        );
        break;
      default:
        form.setValue(
          midpanelState.aiChatProperty.inputName,
          midpanelState.codeToInject,
          { shouldValidate: true },
        );
        break;
    }

    applyMidpanelAction({ type: 'CLEAN_CODE_TO_INJECT' });
    form.trigger();
  }, [form, midpanelState, applyMidpanelAction]);
};
