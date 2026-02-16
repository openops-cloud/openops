import { appConnectionService } from '../../../app-connection/app-connection-service/app-connection-service';
import type {
  WizardContext,
  WizardStepConditional,
} from '../../provider-adapter';

export async function evaluateCondition(
  conditional: WizardStepConditional,
  context: WizardContext,
): Promise<boolean> {
  const expression = conditional.when.trim();

  const isNegated = expression.startsWith('!');
  const condition = isNegated ? expression.slice(1).trim() : expression;

  let result = false;

  if (condition === 'connection.supportsMultiAccount') {
    result = await checkConnectionSupportsMultiAccount(context);
  } else {
    result = !!evaluatePropertyPath(condition, context);
  }

  return isNegated ? !result : result;
}

async function checkConnectionSupportsMultiAccount(
  context: WizardContext,
): Promise<boolean> {
  const connectionId = context.benchmarkConfiguration?.connection?.[0];
  if (!connectionId) {
    return false;
  }

  const connection = await appConnectionService.getOneOrThrow({
    id: connectionId,
    projectId: context.projectId,
  });

  return !!(connection.value as { roles?: unknown[] })?.roles?.length;
}

function evaluatePropertyPath(path: string, context: WizardContext): unknown {
  const parts = path.split('.');

  let current: unknown = context.benchmarkConfiguration;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}
