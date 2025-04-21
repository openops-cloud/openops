import { RETRY_TIMEOUT_MILLISECONDS } from './constants';
import { makeDatabricksHttpRequest } from './make-databricks-http-request';

export async function waitForTaskCompletion({
  workspaceDeploymentName,
  runId,
  token,
  timeoutInSeconds,
}: {
  workspaceDeploymentName: string;
  runId: number;
  token: string;
  timeoutInSeconds: number;
}) {
  const path = `/api/2.2/jobs/runs/get-output`;
  const queryParams = { run_id: runId.toString() };

  const maxAttempts = Math.ceil(
    (timeoutInSeconds * 1000) / RETRY_TIMEOUT_MILLISECONDS,
  );

  let output: any;

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    output = await makeDatabricksHttpRequest<any>({
      deploymentName: workspaceDeploymentName,
      token,
      method: 'GET',
      path,
      queryParams,
    });

    const state = output?.metadata?.state?.life_cycle_state;

    if (
      state !== 'PENDING' &&
      state !== 'RUNNING' &&
      state !== 'BLOCKED' &&
      state !== 'QUEUED'
    ) {
      return output;
    }

    // Only wait if not the last attempt
    if (attempt < maxAttempts) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_TIMEOUT_MILLISECONDS),
      );
    }
  }

  return output;
}
