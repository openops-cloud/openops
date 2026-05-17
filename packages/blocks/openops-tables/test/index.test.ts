import { openopsTables } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct number of actions', () => {
    expect(Object.keys(openopsTables.actions()).length).toBe(6);
    expect(openopsTables.actions()).toMatchObject({
      update_record: {
        name: 'update_record',
        requireAuth: true,
      },
      update_records_batch: {
        name: 'update_records_batch',
        requireAuth: true,
      },
      get_records: {
        name: 'get_records',
        requireAuth: true,
      },
      create_records_batch: {
        name: 'create_records_batch',
        requireAuth: true,
      },
      delete_record: {
        name: 'delete_record',
        requireAuth: true,
      },
      get_table_url: {
        name: 'get_table_url',
        requireAuth: true,
      },
    });
  });
});
