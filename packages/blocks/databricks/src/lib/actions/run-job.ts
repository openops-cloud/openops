import { createAction, Property, Validators } from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { databricksAuth } from '../common/auth';
import { getDatabricksToken } from '../common/get-databricks-token';
import { jobId } from '../common/job-id';
import { waitForTaskCompletion } from '../common/wait-for-task-completion';
import { workspaceDeploymentName } from '../common/workspace-deployment-name';

export const runJob = createAction({
  name: 'runJob',
  auth: databricksAuth,
  displayName: 'Run Databricks Job',
  description:
    'Triggers an existing job in the specified Databricks workspace.',
  props: {
    workspaceDeploymentName: workspaceDeploymentName,
    jobId: jobId,
    parameters: Property.Object({
      displayName: 'Parameters',
      required: false,
      description: 'Optional parameter values to bind job.',
    }),
    timeout: Property.Number({
      displayName: 'Task timeout',
      description:
        'Maximum number of seconds to wait for a task to complete before timing out.',
      required: true,
      validators: [Validators.number, Validators.minValue(0)],
      defaultValue: 50,
    }),
  },

  async run({ auth, propsValue }) {
    const { workspaceDeploymentName, jobId, parameters, timeout } = propsValue;

    const token = await getDatabricksToken(auth);
    const runUrl = `https://${workspaceDeploymentName}.cloud.databricks.com/api/2.2/jobs/run-now`;

    const headers = new AxiosHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const { run_id: runId } = await makeHttpRequest<{
      run_id: number;
      number_in_job: number;
    }>('POST', runUrl, headers, {
      job_id: jobId,
      notebook_params: parameters,
    });

    const runDetailsUrl = `https://${workspaceDeploymentName}.cloud.databricks.com/api/2.2/jobs/runs/get?run_id=${runId}&include_resolved_values=true`;
    const runDetails = await makeHttpRequest<{
      tasks: { run_id: number; task_key: string }[];
    }>('GET', runDetailsUrl, headers);

    const taskOutputs = [];

    for (const task of runDetails.tasks) {
      try {
        const output = await waitForTaskCompletion({
          workspaceDeploymentName,
          runId: task.run_id,
          headers,
          timeoutInSeconds: timeout ?? 0,
        });

        taskOutputs.push({
          task: task.task_key,
          output,
        });
      } catch (err) {
        taskOutputs.push({
          task: task.task_key,
          error: (err as Error)?.message,
        });
      }
    }

    return {
      run_id: runId,
      outputs: taskOutputs,
    };
  },
});
