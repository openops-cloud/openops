const runCommandMock = {
  runCommand: jest.fn(),
};

jest.mock('../src/lib/google-cloud-cli', () => runCommandMock);

import { projectCliDropdown } from '../src/lib/common-properties';

const auth = {
  someAuth: 'secret',
};

describe('projectCliDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns project dropdown when authenticated and useHostSessionCheckbox is false', async () => {
    const projects = [
      { name: 'Project A', projectId: 'proj-a' },
      { name: 'Project B', projectId: 'proj-b' },
    ];
    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
    });

    runCommandMock.runCommand.mockResolvedValue(JSON.stringify(projects));

    const result = await projectCliDropdown.options({ auth }, context);

    expect(runCommandMock.runCommand).toHaveBeenCalledTimes(1);
    expect(runCommandMock.runCommand).toHaveBeenCalledWith(
      'gcloud projects list --format=json',
      auth,
      false,
    );

    expect(result).toStrictEqual({
      disabled: false,
      options: [
        { label: 'Project A', value: 'proj-a' },
        { label: 'Project B', value: 'proj-b' },
      ],
    });
  });

  test('returns project dropdown when useHostSessionCheckbox is true', async () => {
    const projects = [{ name: 'Host Session Project', projectId: 'host-proj' }];
    const context = createContext();
    runCommandMock.runCommand.mockResolvedValue(JSON.stringify(projects));

    const result = await projectCliDropdown.options(
      { auth, useHostSession: { useHostSessionCheckbox: true } },
      context,
    );

    expect(runCommandMock.runCommand).toHaveBeenCalledWith(
      'gcloud projects list --format=json',
      auth,
      true,
    );

    expect(result).toStrictEqual({
      disabled: false,
      options: [{ label: 'Host Session Project', value: 'host-proj' }],
    });
  });

  test('returns error placeholder if runCommand throws', async () => {
    runCommandMock.runCommand.mockRejectedValue(new Error('some gcloud error'));
    const context = createContext();

    const result = await projectCliDropdown.options(
      { auth, useHostSession: { useHostSessionCheckbox: true } },
      context,
    );

    expect(result).toStrictEqual({
      disabled: true,
      options: [],
      placeholder: 'Error fetching projects',
      error: 'Error: some gcloud error',
    });
  });

  test('returns disabled dropdown if no auth is provided and use host session is false', async () => {
    const context = createContext();

    const result = await projectCliDropdown.options(
      { useHostSession: { useHostSessionCheckbox: false } },
      context,
    );

    expect(result).toStrictEqual({
      disabled: true,
      options: [],
      placeholder: 'Please authenticate to see projects.',
    });
  });
});

function createContext(propsValue?: any) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: propsValue,
  };
}
