import {
  AppSystemProp,
  getEngineTimeout,
  system,
  WorkerSystemProps,
} from '@openops/server-shared';
import { EngineOperationType } from '@openops/shared';
import axios, { AxiosInstance } from 'axios';
import {
  EngineHelperResponse,
  EngineHelperResult,
  EngineRunner,
} from './engine-runner';

const WORKER_TOKEN = system.get(WorkerSystemProps.WORKER_TOKEN);

function getClient(timeout: number): AxiosInstance {
  const WORKER_URL = system.getOrThrow(AppSystemProp.WORKER_URL);

  return axios.create({
    baseURL: WORKER_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: (timeout + 30) * 1000,
  });
}

async function executeRemote<Result extends EngineHelperResult>(
  operation: EngineOperationType,
  engineToken: string,
  input: unknown,
): Promise<EngineHelperResponse<Result>> {
  const token = engineToken || WORKER_TOKEN;
  const timeout = getEngineTimeout(operation);

  const response = await getClient(timeout).post(
    '/v1/engine/execute',
    { operation, engineToken, input },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return response.data as EngineHelperResponse<Result>;
}

export const remoteEngineRunner: EngineRunner = {
  async executeFlow(engineToken, operation) {
    return executeRemote(
      EngineOperationType.EXECUTE_FLOW,
      engineToken,
      operation,
    );
  },

  async extractBlockMetadata(operation) {
    return executeRemote(
      EngineOperationType.EXTRACT_BLOCK_METADATA,
      '',
      operation,
    );
  },

  async executeTrigger(engineToken, operation) {
    return executeRemote(
      EngineOperationType.EXECUTE_TRIGGER_HOOK,
      engineToken,
      operation,
    );
  },

  async executeProp(engineToken, operation) {
    return executeRemote(
      EngineOperationType.EXECUTE_PROPERTY,
      engineToken,
      operation,
    );
  },

  async executeValidateAuth(engineToken, operation) {
    return executeRemote(
      EngineOperationType.EXECUTE_VALIDATE_AUTH,
      engineToken,
      operation,
    );
  },

  async executeAction(engineToken, operation) {
    return executeRemote(
      EngineOperationType.EXECUTE_STEP,
      engineToken,
      operation,
    );
  },

  async executeVariable(engineToken, operation) {
    return executeRemote(
      EngineOperationType.RESOLVE_VARIABLE,
      engineToken,
      operation,
    );
  },
};
