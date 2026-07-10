import {
  throwValidationError,
  WizardConfig,
  WizardConfigStep,
} from '@openops/shared';

// Removes excluded steps from a provider wizard config and re-points
// nextStep / conditional.onFailure.skipToStep references at the excluded
// step's surviving successor (transitively). Pure: never mutates the input;
// returns the input reference untouched when there is nothing to exclude.
export function filterWizardConfig(
  config: WizardConfig,
  excludedStepIds: string[] | undefined,
): WizardConfig {
  if (!excludedStepIds || excludedStepIds.length === 0) {
    return config;
  }

  const stepById = new Map(config.steps.map((s) => [s.id, s]));
  for (const id of excludedStepIds) {
    if (!stepById.has(id)) {
      throwValidationError(`Excluded wizard step not found: ${id}`);
    }
  }

  const excluded = new Set(excludedStepIds);
  if (config.steps.every((s) => excluded.has(s.id))) {
    throwValidationError('Cannot exclude every wizard step');
  }

  // Follow the nextStep chain through excluded steps to the first survivor.
  const resolveSurvivor = (id: string | undefined): string | undefined => {
    let current = id;
    while (current !== undefined && excluded.has(current)) {
      current = stepById.get(current)?.nextStep;
    }
    return current;
  };

  const steps: WizardConfigStep[] = config.steps
    .filter((s) => !excluded.has(s.id))
    .map((s) => {
      const nextStep = resolveSurvivor(s.nextStep);
      const skipToStep = resolveSurvivor(s.conditional?.onFailure?.skipToStep);
      return {
        ...s,
        ...(s.nextStep !== undefined ? { nextStep } : {}),
        ...(s.conditional
          ? {
              conditional: {
                ...s.conditional,
                ...(s.conditional.onFailure
                  ? { onFailure: { ...s.conditional.onFailure, skipToStep } }
                  : {}),
              },
            }
          : {}),
      };
    });

  return { ...config, steps };
}
