import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Action } from './actions/action';
import { Trigger } from './triggers/trigger';

const actionValidator = TypeCompiler.Compile(Action);
const triggerValidator = TypeCompiler.Compile(Trigger);

export function validateTriggerImport(triggerImport: Trigger): {
  success: boolean;
  errors?: string[];
} {
  try {
    const errors = Array.from(triggerValidator.Errors(triggerImport));

    if (triggerImport.nextAction) {
      errors.push(
        ...Array.from(actionValidator.Errors(triggerImport.nextAction)),
      );
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors: errors.map((error) => `${error.path}: ${error.message}`),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: [
        (error as Error).message
          ? (error as Error).message
          : 'Unknown validation error',
      ],
    };
  }
}
