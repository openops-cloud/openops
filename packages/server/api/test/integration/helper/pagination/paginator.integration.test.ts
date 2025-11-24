import { DataSource, EntitySchema } from 'typeorm';
import Paginator, {
  Order,
} from '../../../../src/app/helper/pagination/paginator';

jest.mock('@openops/server-shared', () => ({
  DatabaseType: {
    POSTGRES: 'postgres',
    SQLITE3: 'sqlite3',
  },
  system: {
    get: jest.fn().mockReturnValue('sqlite3'),
  },
  AppSystemProp: {
    DB_TYPE: 'DB_TYPE',
  },
}));

const TestFlowRunEntity = new EntitySchema({
  name: 'TestFlowRun',
  tableName: 'test_flow_runs',
  columns: {
    id: {
      type: 'varchar',
      primary: true,
    },
    created: {
      type: 'datetime',
    },
    projectId: {
      type: 'varchar',
    },
    status: {
      type: 'varchar',
    },
  },
});

const TestFlowEntity = new EntitySchema({
  name: 'TestFlow',
  tableName: 'test_flows',
  columns: {
    id: {
      type: 'varchar',
      primary: true,
    },
    created: {
      type: 'datetime',
    },
    projectId: {
      type: 'varchar',
    },
  },
});

const TestFlowVersionEntity = new EntitySchema({
  name: 'TestFlowVersion',
  tableName: 'test_flow_versions',
  columns: {
    id: {
      type: 'varchar',
      primary: true,
    },
    flowId: {
      type: 'varchar',
    },
    updated: {
      type: 'datetime',
    },
    displayName: {
      type: 'varchar',
    },
  },
});

const FOUR_RUNS_TEST_DATA = [
  {
    id: 'run1',
    created: '2025-01-01 08:51:00.880',
    projectId: 'proj1',
    status: 'SUCCEEDED',
  },
  {
    id: 'run2',
    created: '2025-01-01 08:51:00.852',
    projectId: 'proj1',
    status: 'RUNNING',
  },
  {
    id: 'run3',
    created: '2025-01-01 08:51:00.123',
    projectId: 'proj1',
    status: 'SUCCEEDED',
  },
  {
    id: 'run4',
    created: '2025-01-01 08:50:59.999',
    projectId: 'proj1',
    status: 'FAILED',
  },
];

describe('Paginator Integration Tests', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [TestFlowRunEntity, TestFlowEntity, TestFlowVersionEntity],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM test_flow_runs');
    await dataSource.query('DELETE FROM test_flows');
    await dataSource.query('DELETE FROM test_flow_versions');
  });

  describe('Basic Pagination', () => {
    test('should paginate flow runs with default created column', async () => {
      const testData = [
        {
          id: 'run1',
          created: '2025-01-01 08:51:00.880',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        },
        {
          id: 'run2',
          created: '2025-01-01 08:51:00.852',
          projectId: 'proj1',
          status: 'RUNNING',
        },
        {
          id: 'run3',
          created: '2025-01-01 08:51:00.123',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        },
        {
          id: 'run4',
          created: '2025-01-01 08:50:59.999',
          projectId: 'proj1',
          status: 'FAILED',
        },
        {
          id: 'run5',
          created: '2025-01-01 08:50:58.888',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        },
      ];

      for (const data of testData) {
        await dataSource
          .createQueryBuilder()
          .insert()
          .into('test_flow_runs')
          .values(data)
          .execute();
      }

      const paginator = new Paginator(TestFlowRunEntity);
      paginator.setAlias('fr');
      paginator.setOrder(Order.DESC);
      paginator.setLimit(2);

      const query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const result = await paginator.paginate(query);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('run1');
      expect(result.data[1].id).toBe('run2');
      expect(result.cursor.afterCursor).toBeDefined();
      expect(result.cursor.beforeCursor).toBeNull();
    });

    test('should handle backward pagination correctly', async () => {
      const testData = [
        {
          id: 'run1',
          created: '2025-01-01 08:51:00.880',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        },
        {
          id: 'run2',
          created: '2025-01-01 08:51:00.852',
          projectId: 'proj1',
          status: 'RUNNING',
        },
        {
          id: 'run3',
          created: '2025-01-01 08:51:00.123',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        },
        {
          id: 'run4',
          created: '2025-01-01 08:50:59.999',
          projectId: 'proj1',
          status: 'FAILED',
        },
      ];

      for (const data of testData) {
        await dataSource
          .createQueryBuilder()
          .insert()
          .into('test_flow_runs')
          .values(data)
          .execute();
      }

      const paginator = new Paginator(TestFlowRunEntity);
      paginator.setAlias('fr');
      paginator.setOrder(Order.DESC);
      paginator.setLimit(2);

      let query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const firstPage = await paginator.paginate(query);

      const paginator2 = new Paginator(TestFlowRunEntity);
      paginator2.setAlias('fr');
      paginator2.setOrder(Order.DESC);
      paginator2.setLimit(2);
      paginator2.setAfterCursor(firstPage.cursor.afterCursor!);

      query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const secondPage = await paginator2.paginate(query);

      const paginator3 = new Paginator(TestFlowRunEntity);
      paginator3.setAlias('fr');
      paginator3.setOrder(Order.DESC);
      paginator3.setLimit(2);
      paginator3.setBeforeCursor(secondPage.cursor.beforeCursor!);

      query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const backwardPage = await paginator3.paginate(query);

      expect(backwardPage.data).toHaveLength(2);
      expect(backwardPage.data[0].id).toBe('run1');
      expect(backwardPage.data[1].id).toBe('run2');
    });
  });

  describe('Custom Pagination Column', () => {
    test('should set custom pagination column without errors', async () => {
      const testData = [
        {
          id: 'run1',
          created: '2025-01-01 08:51:00.880',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        },
        {
          id: 'run2',
          created: '2025-01-01 08:51:00.852',
          projectId: 'proj1',
          status: 'RUNNING',
        },
      ];

      for (const data of testData) {
        await dataSource
          .createQueryBuilder()
          .insert()
          .into('test_flow_runs')
          .values(data)
          .execute();
      }

      const paginator = new Paginator(TestFlowRunEntity);
      paginator.setAlias('fr');
      paginator.setOrder(Order.DESC);
      paginator.setLimit(2);

      paginator.setPaginationColumn('created', 'fr.created', 'datetime');

      const query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const result = await paginator.paginate(query);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('run1');
      expect(result.data[1].id).toBe('run2');
    });
  });

  describe('Edge Cases', () => {
    describe('refetch when backward result is shorter than limit', () => {
      test.each([3, 4])(
        'returns correct forward window with limit %i',
        async (limit) => {
          const testData = FOUR_RUNS_TEST_DATA;

          for (const data of testData) {
            await dataSource
              .createQueryBuilder()
              .insert()
              .into('test_flow_runs')
              .values(data)
              .execute();
          }

          const queryBase = () =>
            dataSource
              .createQueryBuilder(TestFlowRunEntity, 'fr')
              .where('fr.projectId = :projectId', { projectId: 'proj1' });

          const paginator1 = new Paginator(TestFlowRunEntity);
          paginator1.setAlias('fr');
          paginator1.setOrder(Order.DESC);
          paginator1.setLimit(2);
          const page1 = await paginator1.paginate(queryBase());

          const paginator2 = new Paginator(TestFlowRunEntity);
          paginator2.setAlias('fr');
          paginator2.setOrder(Order.DESC);
          paginator2.setLimit(2);
          paginator2.setAfterCursor(page1.cursor.afterCursor!);
          const page2 = await paginator2.paginate(queryBase());

          const paginatorBack = new Paginator(TestFlowRunEntity);
          paginatorBack.setAlias('fr');
          paginatorBack.setOrder(Order.DESC);
          paginatorBack.setLimit(limit);
          paginatorBack.setBeforeCursor(page2.cursor.beforeCursor!);

          const backPage = await paginatorBack.paginate(queryBase());

          const allIds = ['run1', 'run2', 'run3', 'run4'];
          const expectedIds = allIds.slice(0, Math.min(limit, allIds.length));

          expect(backPage.data.map((d) => d.id)).toEqual(expectedIds);
        },
      );

      test.each([
        { limit: 3, expectAfterDefined: true },
        { limit: 4, expectAfterDefined: false },
      ])(
        'sets expected cursors with limit $limit',
        async ({ limit, expectAfterDefined }) => {
          const testData = FOUR_RUNS_TEST_DATA;

          for (const data of testData) {
            await dataSource
              .createQueryBuilder()
              .insert()
              .into('test_flow_runs')
              .values(data)
              .execute();
          }

          const queryBase = () =>
            dataSource
              .createQueryBuilder(TestFlowRunEntity, 'fr')
              .where('fr.projectId = :projectId', { projectId: 'proj1' });

          const paginator1 = new Paginator(TestFlowRunEntity);
          paginator1.setAlias('fr');
          paginator1.setOrder(Order.DESC);
          paginator1.setLimit(2);
          const page1 = await paginator1.paginate(queryBase());

          const paginator2 = new Paginator(TestFlowRunEntity);
          paginator2.setAlias('fr');
          paginator2.setOrder(Order.DESC);
          paginator2.setLimit(2);
          paginator2.setAfterCursor(page1.cursor.afterCursor!);
          const page2 = await paginator2.paginate(queryBase());

          const paginatorBack = new Paginator(TestFlowRunEntity);
          paginatorBack.setAlias('fr');
          paginatorBack.setOrder(Order.DESC);
          paginatorBack.setLimit(limit);
          paginatorBack.setBeforeCursor(page2.cursor.beforeCursor!);
          const backPage = await paginatorBack.paginate(queryBase());

          if (expectAfterDefined) {
            expect(backPage.cursor.afterCursor).toBeDefined();
          } else {
            expect(backPage.cursor.afterCursor).toBeNull();
          }
          expect(backPage.cursor.beforeCursor).toBeNull();
        },
      );
    });
    test('should handle empty result set', async () => {
      const paginator = new Paginator(TestFlowRunEntity);
      paginator.setAlias('fr');
      paginator.setLimit(10);

      const query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'nonexistent' });

      const result = await paginator.paginate(query);

      expect(result.data).toHaveLength(0);
      expect(result.cursor.afterCursor).toBeNull();
      expect(result.cursor.beforeCursor).toBeNull();
    });

    test('should handle single result', async () => {
      await dataSource
        .createQueryBuilder()
        .insert()
        .into('test_flow_runs')
        .values({
          id: 'run1',
          created: '2025-01-01 08:51:00.880',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        })
        .execute();

      const paginator = new Paginator(TestFlowRunEntity);
      paginator.setAlias('fr');
      paginator.setLimit(10);

      const query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const result = await paginator.paginate(query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('run1');
      expect(result.cursor.afterCursor).toBeNull();
      expect(result.cursor.beforeCursor).toBeNull();
    });

    test('should handle exact page size match', async () => {
      const testData = [
        {
          id: 'run1',
          created: '2025-01-01 08:51:03',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        },
        {
          id: 'run2',
          created: '2025-01-01 08:51:02',
          projectId: 'proj1',
          status: 'RUNNING',
        },
        {
          id: 'run3',
          created: '2025-01-01 08:51:01',
          projectId: 'proj1',
          status: 'FAILED',
        },
      ];

      for (const data of testData) {
        await dataSource
          .createQueryBuilder()
          .insert()
          .into('test_flow_runs')
          .values(data)
          .execute();
      }

      const paginator = new Paginator(TestFlowRunEntity);
      paginator.setAlias('fr');
      paginator.setOrder(Order.DESC);
      paginator.setLimit(3);

      const query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const result = await paginator.paginate(query);

      expect(result.data).toHaveLength(3);
      expect(result.cursor.afterCursor).toBeNull();
      expect(result.cursor.beforeCursor).toBeNull();
    });
  });

  describe('1ms Offset Logic', () => {
    test('should handle rows with same timestamp at second level', async () => {
      const testData = [
        {
          id: 'run1',
          created: '2025-01-01 08:51:00.999',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        },
        {
          id: 'run2',
          created: '2025-01-01 08:51:00.500',
          projectId: 'proj1',
          status: 'RUNNING',
        },
        {
          id: 'run3',
          created: '2025-01-01 08:51:00.100',
          projectId: 'proj1',
          status: 'SUCCEEDED',
        },
        {
          id: 'run4',
          created: '2025-01-01 08:50:59.999',
          projectId: 'proj1',
          status: 'FAILED',
        },
      ];

      for (const data of testData) {
        await dataSource
          .createQueryBuilder()
          .insert()
          .into('test_flow_runs')
          .values(data)
          .execute();
      }

      const paginator1 = new Paginator(TestFlowRunEntity);
      paginator1.setAlias('fr');
      paginator1.setOrder(Order.DESC);
      paginator1.setLimit(2);

      let query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const page1 = await paginator1.paginate(query);

      const paginator2 = new Paginator(TestFlowRunEntity);
      paginator2.setAlias('fr');
      paginator2.setOrder(Order.DESC);
      paginator2.setLimit(2);
      paginator2.setAfterCursor(page1.cursor.afterCursor!);

      query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const page2 = await paginator2.paginate(query);

      const paginator3 = new Paginator(TestFlowRunEntity);
      paginator3.setAlias('fr');
      paginator3.setOrder(Order.DESC);
      paginator3.setLimit(2);
      paginator3.setBeforeCursor(page2.cursor.beforeCursor!);

      query = dataSource
        .createQueryBuilder(TestFlowRunEntity, 'fr')
        .where('fr.projectId = :projectId', { projectId: 'proj1' });

      const backPage = await paginator3.paginate(query);

      expect(page1.data).toHaveLength(2);
      expect(page1.data[0].id).toBe('run1');
      expect(page1.data[1].id).toBe('run2');

      expect(page2.data).toHaveLength(2);

      expect(backPage.data).toHaveLength(2);
      expect(backPage.data[0].id).toBe('run1');
      expect(backPage.data[1].id).toBe('run2');
    });
  });
});
