import { DataSource } from 'typeorm';
import { databaseConnection } from '../../../src/app/database/database-connection';
import { createPostgresDataSource } from '../../../src/app/database/postgres-connection';
import { createSqlLiteDataSource } from '../../../src/app/database/sqlite-connection';
import { system, AppSystemProp, SharedSystemProp } from '@openops/server-shared';
import { DatabaseType, EnvironmentType } from '@openops/shared';

jest.mock('../../../src/app/database/postgres-connection');
jest.mock('../../../src/app/database/sqlite-connection');
jest.mock('@openops/server-shared');

const mockCreatePostgresDataSource = createPostgresDataSource as jest.MockedFunction<typeof createPostgresDataSource>;
const mockCreateSqlLiteDataSource = createSqlLiteDataSource as jest.MockedFunction<typeof createSqlLiteDataSource>;
const mockSystem = system as jest.Mocked<typeof system>;

describe('Database Connection Pool Tests', () => {
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    mockDataSource = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      isInitialized: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      synchronize: jest.fn(),
      dropDatabase: jest.fn(),
      runMigrations: jest.fn(),
      createQueryBuilder: jest.fn(),
      getRepository: jest.fn(),
      createQueryRunner: jest.fn(),
      query: jest.fn(),
      transaction: jest.fn(),
      manager: {
        connection: {} as any,
        queryRunner: undefined,
        transaction: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        createQueryBuilder: jest.fn(),
        query: jest.fn(),
        getRepository: jest.fn(),
      } as any,
    } as any;

    mockCreatePostgresDataSource.mockReturnValue(mockDataSource);
    mockCreateSqlLiteDataSource.mockReturnValue(mockDataSource);
    mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
    mockSystem.getOrThrow.mockReturnValue(EnvironmentType.PRODUCTION);

    jest.clearAllMocks();
  });

  describe('Connection Pool Management', () => {
    it('should create single connection instance (singleton pattern)', () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);

      const connection1 = databaseConnection();
      const connection2 = databaseConnection();

      expect(connection1).toBe(connection2);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
      expect(mockCreateSqlLiteDataSource).not.toHaveBeenCalled();
    });

    it('should create SQLite connection when configured', () => {
      mockSystem.get.mockReturnValue(DatabaseType.SQLITE3);

      const connection = databaseConnection();

      expect(connection).toBe(mockDataSource);
      expect(mockCreateSqlLiteDataSource).toHaveBeenCalledTimes(1);
      expect(mockCreatePostgresDataSource).not.toHaveBeenCalled();
    });

    it('should handle connection initialization failures', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.initialize.mockRejectedValue(new Error('Connection failed'));

      const connection = databaseConnection();

      await expect(connection.initialize()).rejects.toThrow('Connection failed');
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });

    it('should handle connection pool exhaustion', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.createQueryRunner.mockImplementation(() => {
        throw new Error('Connection pool exhausted');
      });

      const connection = databaseConnection();

      expect(() => connection.createQueryRunner()).toThrow('Connection pool exhausted');
    });
  });

  describe('Connection Pool Stress Testing', () => {
    it('should handle multiple concurrent connection requests', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);

      const connectionPromises = Array.from({ length: 10 }, () => 
        Promise.resolve(databaseConnection())
      );

      const connections = await Promise.all(connectionPromises);

      expect(connections).toHaveLength(10);
      expect(connections.every(conn => conn === connections[0])).toBe(true);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent query execution', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.query.mockImplementation(async (query: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return [{ id: 1, query }];
      });

      const connection = databaseConnection();

      const queryPromises = Array.from({ length: 5 }, (_, i) =>
        connection.query(`SELECT * FROM test_table_${i}`)
      );

      const results = await Promise.all(queryPromises);

      expect(results).toHaveLength(5);
      expect(mockDataSource.query).toHaveBeenCalledTimes(5);
    });

    it('should handle connection timeout scenarios', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.query.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return [];
      });

      const connection = databaseConnection();

      const timeoutPromise = Promise.race([
        connection.query('SELECT * FROM slow_table'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 1000)
        )
      ]);

      await expect(timeoutPromise).rejects.toThrow('Query timeout');
    });

    it('should handle memory pressure during large result sets', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      
      const largeResultSet = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(1000),
        timestamp: new Date().toISOString(),
      }));

      mockDataSource.query.mockImplementation(async (query: string) => {
        if (query.includes('large_table')) {
          return largeResultSet;
        }
        return [];
      });

      const connection = databaseConnection();

      const result = await connection.query('SELECT * FROM large_table');

      expect(result).toHaveLength(100000);
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT * FROM large_table');
    });
  });

  describe('Connection Pool Configuration', () => {
    it('should handle PostgreSQL connection with URL', () => {
      mockSystem.get.mockImplementation((prop) => {
        if (prop === AppSystemProp.DB_TYPE) return DatabaseType.POSTGRES;
        if (prop === AppSystemProp.POSTGRES_URL) return 'postgresql://user:pass@host:5432/db';
        return null;
      });

      const connection = databaseConnection();

      expect(connection).toBe(mockDataSource);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });

    it('should handle PostgreSQL connection with individual parameters', () => {
      mockSystem.get.mockImplementation((prop) => {
        if (prop === AppSystemProp.DB_TYPE) return DatabaseType.POSTGRES;
        if (prop === AppSystemProp.POSTGRES_URL) return null;
        return null;
      });

      mockSystem.getOrThrow.mockImplementation((prop) => {
        const config = {
          [AppSystemProp.POSTGRES_DATABASE]: 'test_db',
          [AppSystemProp.POSTGRES_HOST]: 'localhost',
          [AppSystemProp.POSTGRES_PASSWORD]: 'password',
          [AppSystemProp.POSTGRES_PORT]: '5432',
          [AppSystemProp.POSTGRES_USERNAME]: 'user',
          [SharedSystemProp.ENVIRONMENT]: EnvironmentType.PRODUCTION,
        };
        return config[prop];
      });

      const connection = databaseConnection();

      expect(connection).toBe(mockDataSource);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });

    it('should handle SSL configuration', () => {
      mockSystem.get.mockImplementation((prop) => {
        if (prop === AppSystemProp.DB_TYPE) return DatabaseType.POSTGRES;
        if (prop === AppSystemProp.POSTGRES_USE_SSL) return 'true';
        if (prop === AppSystemProp.POSTGRES_SSL_CA) return 'cert-content\\nwith\\nnewlines';
        return null;
      });

      const connection = databaseConnection();

      expect(connection).toBe(mockDataSource);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });

    it('should handle missing configuration parameters', () => {
      mockSystem.get.mockImplementation((prop) => {
        if (prop === AppSystemProp.DB_TYPE) return DatabaseType.POSTGRES;
        if (prop === AppSystemProp.POSTGRES_URL) return null;
        return null;
      });

      mockSystem.getOrThrow.mockImplementation((prop) => {
        if (prop === AppSystemProp.POSTGRES_DATABASE) {
          throw new Error('POSTGRES_DATABASE is required');
        }
        return 'value';
      });

      expect(() => databaseConnection()).toThrow('POSTGRES_DATABASE is required');
    });
  });

  describe('Transaction Management', () => {
    it('should handle concurrent transaction execution', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      
      let transactionCount = 0;
      mockDataSource.transaction.mockImplementation(async (callback) => {
        transactionCount++;
        const mockEntityManager = {
          save: jest.fn().mockResolvedValue({ id: transactionCount }),
          remove: jest.fn().mockResolvedValue(undefined),
          findOne: jest.fn().mockResolvedValue(null),
          find: jest.fn().mockResolvedValue([]),
          createQueryBuilder: jest.fn(),
          query: jest.fn().mockResolvedValue([]),
          getRepository: jest.fn(),
        } as any;
        
        return callback(mockEntityManager);
      });

      const connection = databaseConnection();

      const transactionPromises = Array.from({ length: 3 }, async (_, i) => {
        return connection.transaction(async (manager) => {
          await manager.save({ data: `transaction-${i}` });
          return `result-${i}`;
        });
      });

      const results = await Promise.all(transactionPromises);

      expect(results).toEqual(['result-0', 'result-1', 'result-2']);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(3);
    });

    it('should handle transaction rollback on errors', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockEntityManager = {
          save: jest.fn().mockRejectedValue(new Error('Save failed')),
          remove: jest.fn(),
          findOne: jest.fn(),
          find: jest.fn(),
          createQueryBuilder: jest.fn(),
          query: jest.fn(),
          getRepository: jest.fn(),
        } as any;
        
        return callback(mockEntityManager);
      });

      const connection = databaseConnection();

      await expect(connection.transaction(async (manager) => {
        await manager.save({ data: 'test' });
        return 'success';
      })).rejects.toThrow('Save failed');

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle nested transaction scenarios', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      
      let nestedLevel = 0;
      mockDataSource.transaction.mockImplementation(async (callback) => {
        nestedLevel++;
        const mockEntityManager = {
          save: jest.fn().mockResolvedValue({ id: nestedLevel }),
          transaction: jest.fn().mockImplementation(async (nestedCallback) => {
            return nestedCallback(mockEntityManager);
          }),
          remove: jest.fn(),
          findOne: jest.fn(),
          find: jest.fn(),
          createQueryBuilder: jest.fn(),
          query: jest.fn(),
          getRepository: jest.fn(),
        } as any;
        
        return callback(mockEntityManager);
      });

      const connection = databaseConnection();

      const result = await connection.transaction(async (manager) => {
        await manager.save({ data: 'outer' });
        return manager.transaction(async (nestedManager) => {
          await nestedManager.save({ data: 'inner' });
          return 'nested-success';
        });
      });

      expect(result).toBe('nested-success');
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Database Connection Failures', () => {
    it('should handle database server unavailability', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.initialize.mockRejectedValue(new Error('ECONNREFUSED'));

      const connection = databaseConnection();

      await expect(connection.initialize()).rejects.toThrow('ECONNREFUSED');
    });

    it('should handle authentication failures', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.initialize.mockRejectedValue(new Error('Authentication failed'));

      const connection = databaseConnection();

      await expect(connection.initialize()).rejects.toThrow('Authentication failed');
    });

    it('should handle database not found errors', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.initialize.mockRejectedValue(new Error('Database "nonexistent" does not exist'));

      const connection = databaseConnection();

      await expect(connection.initialize()).rejects.toThrow('Database "nonexistent" does not exist');
    });

    it('should handle network partition scenarios', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.query.mockImplementation(async () => {
        throw new Error('Connection lost');
      });

      const connection = databaseConnection();

      await expect(connection.query('SELECT 1')).rejects.toThrow('Connection lost');
    });

    it('should handle connection pool cleanup on errors', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.destroy.mockResolvedValue(undefined);

      const connection = databaseConnection();

      await connection.destroy();

      expect(mockDataSource.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Query Builder and Repository Access', () => {
    it('should handle concurrent query builder access', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockDataSource.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const connection = databaseConnection();

      const queryPromises = Array.from({ length: 3 }, async (_, i) => {
        const qb = connection.createQueryBuilder();
        return qb.select('*').from('test_table', 'tt').where('id = :id', { id: i }).getMany();
      });

      const results = await Promise.all(queryPromises);

      expect(results).toHaveLength(3);
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(3);
    });

    it('should handle repository access failures', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.getRepository.mockImplementation(() => {
        throw new Error('Repository not found');
      });

      const connection = databaseConnection();

      expect(() => connection.getRepository('TestEntity')).toThrow('Repository not found');
    });

    it('should handle query runner resource management', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        query: jest.fn().mockResolvedValue([]),
        manager: {
          save: jest.fn(),
          remove: jest.fn(),
          findOne: jest.fn(),
          find: jest.fn(),
        },
      };

      mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);

      const connection = databaseConnection();

      const queryRunner = connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.query('SELECT 1');
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
      } finally {
        await queryRunner.release();
      }

      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should handle testing environment configuration', () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockSystem.getOrThrow.mockReturnValue(EnvironmentType.TESTING);

      const connection = databaseConnection();

      expect(connection).toBe(mockDataSource);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });

    it('should handle production environment configuration', () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockSystem.getOrThrow.mockReturnValue(EnvironmentType.PRODUCTION);

      const connection = databaseConnection();

      expect(connection).toBe(mockDataSource);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });

    it('should handle development environment configuration', () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockSystem.getOrThrow.mockReturnValue(EnvironmentType.DEVELOPMENT);

      const connection = databaseConnection();

      expect(connection).toBe(mockDataSource);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });
  });

  describe('Migration and Schema Management', () => {
    it('should handle migration execution', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.runMigrations.mockResolvedValue([]);

      const connection = databaseConnection();

      await connection.runMigrations();

      expect(mockDataSource.runMigrations).toHaveBeenCalledTimes(1);
    });

    it('should handle schema synchronization', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.synchronize.mockResolvedValue(undefined);

      const connection = databaseConnection();

      await connection.synchronize();

      expect(mockDataSource.synchronize).toHaveBeenCalledTimes(1);
    });

    it('should handle database drop operations', async () => {
      mockSystem.get.mockReturnValue(DatabaseType.POSTGRES);
      mockDataSource.dropDatabase.mockResolvedValue(undefined);

      const connection = databaseConnection();

      await connection.dropDatabase();

      expect(mockDataSource.dropDatabase).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Pool Edge Cases', () => {
    it('should handle database type switching', () => {
      let callCount = 0;
      mockSystem.get.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? DatabaseType.POSTGRES : DatabaseType.SQLITE3;
      });

      const connection1 = databaseConnection();
      const connection2 = databaseConnection();

      expect(connection1).toBe(connection2);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
      expect(mockCreateSqlLiteDataSource).not.toHaveBeenCalled();
    });

    it('should handle invalid database type', () => {
      mockSystem.get.mockReturnValue('INVALID_DB_TYPE');

      const connection = databaseConnection();

      expect(connection).toBe(mockDataSource);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });

    it('should handle null database type', () => {
      mockSystem.get.mockReturnValue(null);

      const connection = databaseConnection();

      expect(connection).toBe(mockDataSource);
      expect(mockCreatePostgresDataSource).toHaveBeenCalledTimes(1);
    });
  });
});