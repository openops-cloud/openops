/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionContext } from '@openops/blocks-framework';
import { insertRow } from '../src/lib/actions/insert-row';
import { configureConnection } from '../src/lib/common/configure-connection';
import { connect, destroy, execute } from '../src/lib/common/utils';

jest.mock('../src/lib/common/configure-connection');
jest.mock('../src/lib/common/utils', () => ({
  connect: jest.fn(),
  destroy: jest.fn(),
  execute: jest.fn(),
}));

describe('insertRow action', () => {
  let context: Partial<ActionContext<any, any>>;

  beforeEach(() => {
    context = {
      auth: { token: 'fake-token' },
      propsValue: {
        table: 'users',
        table_column_values: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    };

    (configureConnection as jest.Mock).mockReturnValue('mocked-connection');
    (execute as jest.Mock).mockResolvedValue([{ success: true }]);
  });

  it('should insert a row successfully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await insertRow.run(context as ActionContext<any, any>);

    expect(configureConnection).toHaveBeenCalledWith(context.auth);
    expect(connect).toHaveBeenCalledWith('mocked-connection');
    expect(execute).toHaveBeenCalledWith(
      'mocked-connection',
      'INSERT INTO users(id,name,email) VALUES(?, ?, ?)',
      [1, 'John Doe', 'john@example.com'],
    );
    expect(destroy).toHaveBeenCalledWith('mocked-connection');
    expect(result).toEqual([{ success: true }]);
  });

  it('should handle errors gracefully', async () => {
    (execute as jest.Mock).mockRejectedValue(new Error('Database error'));

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insertRow.run(context as ActionContext<any, any>),
    ).rejects.toThrow('Database error');
    expect(destroy).toHaveBeenCalledWith('mocked-connection');
  });
});
