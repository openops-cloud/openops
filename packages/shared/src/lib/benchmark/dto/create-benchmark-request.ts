import { Static, Type } from '@sinclair/typebox';
import { WizardState } from '../../wizard/wizard-request';

export const CreateBenchmarkRequest = Type.Object({
  wizardState: WizardState,
});

export type CreateBenchmarkRequest = Static<typeof CreateBenchmarkRequest>;
