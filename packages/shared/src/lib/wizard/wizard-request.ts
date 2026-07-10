import { Static, Type } from '@sinclair/typebox';

export const WizardState = Type.Record(
  Type.String(),
  Type.Array(Type.String()),
);

export type WizardState = Static<typeof WizardState>;

export const WizardRequest = Type.Object({
  currentStep: Type.Optional(Type.String()),
  wizardState: Type.Optional(WizardState),
  templateId: Type.Optional(Type.String()),
});

export type WizardRequest = Static<typeof WizardRequest>;
