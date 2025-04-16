import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { RETRY_TIMEOUT_MILLISECONDS } from './constants';

export async function waitForTaskCompletion({
  workspaceDeploymentName,
  runId,
  headers,
  timeoutInSeconds,
}: {
  workspaceDeploymentName: string;
  runId: number;
  headers: AxiosHeaders;
  timeoutInSeconds: number;
}) {
  const url = `https://${workspaceDeploymentName}.cloud.databricks.com/api/2.2/jobs/runs/get-output?run_id=${runId}`;

  const maxAttempts = Math.ceil(
    (timeoutInSeconds * 1000) / RETRY_TIMEOUT_MILLISECONDS,
  );

  let output: any;

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    output = await makeHttpRequest('GET', url, headers);

    const state = output?.metadata?.state?.life_cycle_state;

    if (
      state !== 'PENDING' &&
      state !== 'RUNNING' &&
      state !== 'BLOCKED' &&
      state !== 'QUEUED'
    ) {
      return output;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, RETRY_TIMEOUT_MILLISECONDS),
    );
  }

  return output;
}
