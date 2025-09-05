import { terraform } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct number of actions', () => {
    expect(Object.keys(terraform.actions()).length).toBe(3);
    expect(terraform.actions()).toMatchObject({
      delete_terraform_resource: {
        name: 'delete_terraform_resource',
        requireAuth: true,
      },
      update_terraform_file: {
        name: 'update_terraform_file',
        requireAuth: true,
      },
      update_terraform_variables_file: {
        name: 'update_terraform_variables_file',
        requireAuth: true,
      },
    });
  });
});
