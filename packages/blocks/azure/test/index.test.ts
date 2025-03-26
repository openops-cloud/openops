const openOpsMock = {
  getUseHostSessionProperty: jest.fn().mockReturnValue({
    type: 'DYNAMIC',
    required: true,
  }),
  dryRunCheckBox: jest.fn().mockReturnValue({
    required: false,
    defaultValue: false,
    type: 'CHECKBOX',
  }),
};

jest.mock('@openops/common', () => openOpsMock);
jest.mock('@openops/server-shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { azure } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct actions', () => {
    expect(Object.keys(azure.actions()).length).toBe(2);
    expect(azure.actions()).toMatchObject({
      azure_cli: {
        name: 'azure_cli',
        requireAuth: true,
      },
      advisor: {
        name: 'advisor',
        requireAuth: true,
      },
    });
  });
});
