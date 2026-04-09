import { Static, Type } from '@sinclair/typebox';

export const WizardState = Type.Record(
  Type.String(),
  Type.Array(Type.String()),
);

export type WizardState = Static<typeof WizardState>;

export const WizardRequest = Type.Object({
  currentStep: Type.Optional(Type.String()),
  wizardState: Type.Optional(WizardState),
});

export type WizardRequest = Static<typeof WizardRequest>;
