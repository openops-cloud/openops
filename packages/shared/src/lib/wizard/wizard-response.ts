import { Static, Type } from '@sinclair/typebox';

export const WizardOption = Type.Object({
  id: Type.String(),
  displayName: Type.String(),
  imageLogoUrl: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export type WizardOption = Static<typeof WizardOption>;

export const WizardStepResponse = Type.Object({
  currentStep: Type.String(),
  title: Type.String(),
  description: Type.Optional(Type.String()),
  nextStep: Type.Union([Type.String(), Type.Null()]),
  selectionType: Type.Union([
    Type.Literal('single'),
    Type.Literal('multi-select'),
  ]),
  options: Type.Array(WizardOption),
  stepIndex: Type.Number(),
  totalSteps: Type.Number(),
  preselectedOptions: Type.Optional(Type.Array(Type.String())),
});

export type WizardStepResponse = Static<typeof WizardStepResponse>;
