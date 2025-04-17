import { createAction, Property, Validators } from '@openops/blocks-framework';
import { databricksAuth } from '../common/auth';
import { getDatabricksToken } from '../common/get-databricks-token';
import { jobId } from '../common/job-id';
import { makeDatabricksHttpRequest } from '../common/make-databricks-http-request';
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
      displayName: 'Job timeout',
      description:
        'Maximum number of seconds to wait for all task in the job to complete before timing out.',
      required: true,
      validators: [Validators.number, Validators.minValue(0)],
      defaultValue: 50,
    }),
  },

  async run({ auth, propsValue }) {
    const { workspaceDeploymentName, jobId, parameters, timeout } = propsValue;

    const token = await getDatabricksToken(auth);

    const { run_id: runId } = await makeDatabricksHttpRequest<{
      run_id: number;
      number_in_job: number;
    }>({
      deploymentName: workspaceDeploymentName,
      token,
      method: 'POST',
      path: '/api/2.2/jobs/run-now',
      body: {
        job_id: jobId,
        notebook_params: parameters,
      },
    });

    const runDetails = await makeDatabricksHttpRequest<{
      tasks: { run_id: number; task_key: string }[];
    }>({
      deploymentName: workspaceDeploymentName,
      token,
      method: 'GET',
      path: '/api/2.2/jobs/runs/get',
      queryParams: {
        run_id: runId.toString(),
        include_resolved_values: 'true',
      },
    });

    const taskPromises = runDetails.tasks.map(async (task) => {
      try {
        const output = await waitForTaskCompletion({
          workspaceDeploymentName,
          runId: task.run_id,
          token: token,
          timeoutInSeconds: timeout ?? 0,
        });

        return {
          task: task.task_key,
          output,
        };
      } catch (err) {
        return {
          task: task.task_key,
          error: (err as Error)?.message,
        };
      }
    });

    const taskOutputs = await Promise.all(taskPromises);

    return {
      run_id: runId,
      outputs: taskOutputs,
    };
  },
});
