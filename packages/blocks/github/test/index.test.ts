import { github } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct number of actions', () => {
    expect(Object.keys(github.actions()).length).toBe(4);
    expect(github.actions()).toMatchObject({
      get_file_action: {
        name: 'get_file_action',
        requireAuth: true,
      },
      create_pull_request_action: {
        name: 'create_pull_request_action',
        requireAuth: true,
      },
      run_workflow_action: {
        name: 'run_workflow_action',
        requireAuth: true,
      },
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
