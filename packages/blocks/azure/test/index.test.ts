import { azure } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct actions', () => {
    expect(Object.keys(azure.actions()).length).toBe(1);
    expect(azure.actions()).toMatchObject({
      azure_cli: {
        name: 'azure_cli',
        requireAuth: true,
      },
    });
  });
});
