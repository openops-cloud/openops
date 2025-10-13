import { HttpMethod } from '@openops/blocks-common';
import {
  createAction,
  OAuth2PropertyValue,
  Property,
} from '@openops/blocks-framework';
import * as yaml from 'js-yaml';
import { auth } from '../common/auth';
import { getBranchProperty } from '../common/branch-property';
import {
  getWorkflow,
  listWorkflows,
  WorkflowConfig,
} from '../common/github-api';
import { makeRequest } from '../common/http-request';
import { getRepositoryProperty } from '../common/repository-property';

export const runWorkflowAction = createAction({
  auth: auth,
  name: 'run_workflow_action',
  description: 'Trigger a GitHub Actions workflow run',
  displayName: 'Trigger Workflow',
  requireAuth: true,
  IsWriteAction: true,
  props: {
    repository: getRepositoryProperty(),
    workflow: Property.Dropdown<{ id: string; path: string }>({
      displayName: 'Workflow',
      description: 'The workflow to run',
      required: true,
      refreshers: ['repository'],
      options: async ({ repository, auth }) => {
        if (!repository) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please select a repository first',
          };
        }
        const repo = repository as { repo: string; owner: string };
        const authProp = auth as OAuth2PropertyValue;
        const result = await listWorkflows(repo.owner, repo.repo, authProp);
        return {
          disabled: false,
          options: result.workflows.map((workflow) => {
            return {
              label: workflow.path,
              value: {
                id: workflow.id,
                path: workflow.path,
              },
            };
          }),
        };
      },
    }),
    branch: getBranchProperty(),
    inputs: Property.DynamicProperties({
      displayName: 'Inputs',
      description: 'Input keys and values configured in the workflow file.',
      required: false,
      refreshers: ['workflow'],
      props: async ({ auth, repository, workflow }) => {
        if (!workflow) {
          return {};
        }

        const { path } = workflow as { path: string; id: string };
        const { repo, owner } = repository as { repo: string; owner: string };
        const workflowYaml = await getWorkflow(
          owner,
          repo,
          path,
          auth as OAuth2PropertyValue,
          { accept: 'application/vnd.github.v3.raw' },
        );

        const parsedWorkflow: WorkflowConfig = yaml.load(
          workflowYaml,
        ) as unknown as WorkflowConfig;
        const inputs = parsedWorkflow.on?.workflow_dispatch?.inputs;

        const properties: { [key: string]: any } = {};

        for (const key in inputs) {
          properties[key] = Property.LongText({
            displayName: key,
            description: inputs[key].description ?? `Input for ${key}`,
            defaultValue: inputs[key].default ?? '',
            required: inputs[key].required ?? false,
          });
        }

        return properties;
      },
    }),
  },
  async run(context) {
    try {
      const repo = context.propsValue.repository;
      const workflow = context.propsValue.workflow;
      if (!repo || !workflow) {
        throw new Error('Repository or Workflow is undefined');
      }

      const url = `repos/${repo.owner}/${repo.repo}/actions/workflows/${workflow.id}/dispatches`;
      const body = {
        ref: context.propsValue.branch,
        inputs: context.propsValue.inputs,
      };

      return await makeRequest({
        url,
        httpMethod: HttpMethod.POST,
        authProp: context.auth,
        body,
      });
    } catch (e) {
      throw new Error(
        `An error occurred while running the workflow. Failed with: ${e}`,
      );
    }
  },
});
