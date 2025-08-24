import { AppSystemProp, DatabaseType, system } from '@openops/server-shared';
import {
  Brackets,
  EntitySchema,
  ObjectLiteral,
  SelectQueryBuilder,
  WhereExpressionBuilder,
} from 'typeorm';
import {
  atob,
  btoa,
  decodeByType,
  encodeByType,
  getValueByPath,
} from './pagination-utils';

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type CursorParam = Record<string, unknown>;

export type CursorResult = {
  beforeCursor: string | null;
  afterCursor: string | null;
};

export type PagingResult<Entity> = {
  data: Entity[];
  cursor: CursorResult;
};

const PAGINATION_KEY = 'created';
const CUSTOM_PAGINATION_KEY = 'custom_pagination';
const DEFAULT_TIMESTAMP_TYPE = 'timestamp with time zone';

export default class Paginator<Entity extends ObjectLiteral> {
  private afterCursor: string | null = null;

  private beforeCursor: string | null = null;

  private nextAfterCursor: string | null = null;

  private nextBeforeCursor: string | null = null;

  private alias: string = this.entity.options.name;

  private limit = 100;

  private order: Order = Order.DESC;

  private paginationColumnPath: string | null = null;

  private paginationColumnName: string | null = null;

  private paginationColumnType: string | null = null;

  public constructor(private readonly entity: EntitySchema) {}

  public setPaginationColumn(
    columnPath: string,
    columnName: string,
    columnType = DEFAULT_TIMESTAMP_TYPE,
  ): void {
    this.paginationColumnPath = columnPath;
    this.paginationColumnName = columnName;
    this.paginationColumnType = columnType;
  }

  public setAlias(alias: string): void {
    this.alias = alias;
  }

  public setAfterCursor(cursor: string): void {
    this.afterCursor = cursor;
  }

  public setBeforeCursor(cursor: string): void {
    this.beforeCursor = cursor;
  }

  public setLimit(limit: number): void {
    this.limit = limit;
  }

  public setOrder(order: Order): void {
    this.order = order;
  }

  public async paginate(
    builder: SelectQueryBuilder<Entity>,
  ): Promise<PagingResult<Entity>> {
    const entities = await this.appendPagingQuery(builder).getMany();
    const hasMore = entities.length > this.limit;

    if (hasMore) {
      entities.splice(entities.length - 1, 1);
    }

    if (entities.length === 0) {
      return this.toPagingResult(entities);
    }

    if (!this.hasAfterCursor() && this.hasBeforeCursor()) {
      entities.reverse();
    }

    if (this.hasBeforeCursor() || hasMore) {
      this.nextAfterCursor = this.encodeByCustomColumn(
        entities[entities.length - 1],
      );
    }

    if (this.hasAfterCursor() || (hasMore && this.hasBeforeCursor())) {
      this.nextBeforeCursor = this.encodeByCustomColumn(entities[0]);
    }

    return this.toPagingResult(entities);
  }

  private getCursor(): CursorResult {
    return {
      afterCursor: this.nextAfterCursor,
      beforeCursor: this.nextBeforeCursor,
    };
  }

  private appendPagingQuery(
    builder: SelectQueryBuilder<Entity>,
  ): SelectQueryBuilder<Entity> {
    const cursors: CursorParam = {};
    const clonedBuilder = new SelectQueryBuilder<Entity>(builder);

    if (this.hasAfterCursor()) {
      Object.assign(cursors, this.decode(this.afterCursor!));
    } else if (this.hasBeforeCursor()) {
      Object.assign(cursors, this.decode(this.beforeCursor!));
    }

    if (Object.keys(cursors).length > 0) {
      clonedBuilder.andWhere(
        new Brackets((where) => this.buildCursorQuery(where, cursors)),
      );
    }

    clonedBuilder.take(this.limit + 1);
    for (const [key, value] of Object.entries(this.buildOrder())) {
      clonedBuilder.addOrderBy(key, value);
    }
    return clonedBuilder;
  }

  private buildCursorQuery(
    where: WhereExpressionBuilder,
    cursors: CursorParam,
  ): void {
    const dbType = system.get(AppSystemProp.DB_TYPE);
    const operator = this.getOperator();
    let queryString: string;

    const isCustomColumn =
      this.paginationColumnName && cursors[CUSTOM_PAGINATION_KEY];
    const columnName = isCustomColumn
      ? this.paginationColumnName
      : `${this.alias}.${PAGINATION_KEY}`;
    const paramName = isCustomColumn ? CUSTOM_PAGINATION_KEY : PAGINATION_KEY;

    if (dbType === DatabaseType.SQLITE3) {
      queryString = `strftime('%s', ${columnName}) ${operator} strftime('%s', :${paramName})`;
    } else if (dbType === DatabaseType.POSTGRES) {
      queryString = `DATE_TRUNC('second', ${columnName}) ${operator} DATE_TRUNC('second', :${paramName}::timestamp)`;
    } else {
      throw new Error('Unsupported database type');
    }

    where.orWhere(queryString, cursors);
  }

  private getOperator(): string {
    if (this.hasAfterCursor()) {
      return this.order === Order.ASC ? '>' : '<';
    }

    if (this.hasBeforeCursor()) {
      return this.order === Order.ASC ? '<' : '>';
    }

    return '=';
  }

  private buildOrder(): Record<string, Order> {
    let { order } = this;

    if (!this.hasAfterCursor() && this.hasBeforeCursor()) {
      order = this.flipOrder(order);
    }

    const orderByCondition: Record<string, Order> = {};

    if (this.paginationColumnName) {
      orderByCondition[this.paginationColumnName] = order;
    }

    orderByCondition[`${this.alias}.${PAGINATION_KEY}`] = order;

    return orderByCondition;
  }

  private hasAfterCursor(): boolean {
    return this.afterCursor !== null;
  }

  private hasBeforeCursor(): boolean {
    return this.beforeCursor !== null;
  }

  private encode(entity: Entity): string {
    const type = this.getEntityPropertyType(PAGINATION_KEY);
    const value = encodeByType(type, entity[PAGINATION_KEY]);
    const payload = `${PAGINATION_KEY}:${value}`;

    return btoa(payload);
  }

  private encodeByCustomColumn(entity: Entity): string {
    if (!this.paginationColumnPath || !this.paginationColumnName) {
      return this.encode(entity);
    }

    const value = getValueByPath(entity, this.paginationColumnPath);
    if (!value) {
      throw new Error(
        `Pagination column not found at path: ${this.paginationColumnPath}`,
      );
    }

    const encodedValue = encodeByType(
      this.paginationColumnType || DEFAULT_TIMESTAMP_TYPE,
      value,
    );
    const payload = `${CUSTOM_PAGINATION_KEY}:${encodedValue}`;

    return btoa(payload);
  }

  private decode(cursor: string): CursorParam {
    const cursors: CursorParam = {};
    const columns = atob(cursor).split(',');
    columns.forEach((column) => {
      const [key, raw] = column.split(':');
      const type = this.getEntityPropertyType(key);
      const value = decodeByType(type, raw);
      cursors[key] = value;
    });

    return cursors;
  }

  private getEntityPropertyType(key: string): string {
    if (key === CUSTOM_PAGINATION_KEY) {
      return this.paginationColumnType || DEFAULT_TIMESTAMP_TYPE;
    }

    const col = this.entity.options.columns[key];
    if (col === undefined) {
      throw new Error('entity property not found ' + key);
    }
    return col.type.toString();
  }

  private flipOrder(order: Order): Order {
    return order === Order.ASC ? Order.DESC : Order.ASC;
  }

  private toPagingResult<Entity>(entities: Entity[]): PagingResult<Entity> {
    return {
      data: entities,
      cursor: this.getCursor(),
    };
  }
}
