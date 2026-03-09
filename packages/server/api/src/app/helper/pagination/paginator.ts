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

type CursorContext = {
  primaryColumnName: string;
  primaryParamName: string;
  secondaryColumnName: string | null;
  secondaryParamName: string | null;
};

const PAGINATION_KEY = 'created';
const CUSTOM_PAGINATION_KEY = 'custom_pagination';
const CUSTOM_PAGINATION_SECONDARY_KEY = 'custom_pagination_tie_breaker';
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

  private paginationSecondaryColumnPath: string | null = null;

  private paginationSecondaryColumnName: string | null = null;

  private paginationSecondaryColumnType: string | null = null;

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

  public setPaginationSecondaryColumn(
    columnPath: string,
    columnName: string,
    columnType = 'string',
  ): void {
    this.paginationSecondaryColumnPath = columnPath;
    this.paginationSecondaryColumnName = columnName;
    this.paginationSecondaryColumnType = columnType;
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
    let entities = await this.appendPagingQuery(builder).getMany();
    let hasMore = entities.length > this.limit;

    if (
      this.hasBeforeCursor() &&
      !this.hasAfterCursor() &&
      entities.length < this.limit
    ) {
      this.afterCursor = null;
      this.beforeCursor = null;
      this.nextAfterCursor = null;
      this.nextBeforeCursor = null;

      entities = await this.appendPagingQuery(builder).getMany();
      hasMore = entities.length > this.limit;
    }

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
    const dbType = this.getSupportedDbType();
    const operator = this.getOperator();
    const context = this.resolveCursorContext(cursors);

    if (context.secondaryColumnName && context.secondaryParamName) {
      this.applyCompositeCursorFilter(
        where,
        cursors,
        dbType,
        operator,
        context,
      );
      return;
    }

    this.applySingleColumnCursorFilter(
      where,
      cursors,
      dbType,
      operator,
      context,
    );
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
    } else {
      orderByCondition[`${this.alias}.${PAGINATION_KEY}`] = order;
    }

    if (this.paginationColumnName && this.paginationSecondaryColumnName) {
      orderByCondition[this.paginationSecondaryColumnName] = order;
    }

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
    const payload = [`${CUSTOM_PAGINATION_KEY}:${encodedValue}`];

    if (
      this.paginationSecondaryColumnPath &&
      this.paginationSecondaryColumnName
    ) {
      const secondaryValue = getValueByPath(
        entity,
        this.paginationSecondaryColumnPath,
      );
      if (secondaryValue === null || secondaryValue === undefined) {
        throw new Error(
          `Pagination secondary column not found at path: ${this.paginationSecondaryColumnPath}`,
        );
      }
      const encodedSecondaryValue = encodeByType(
        this.paginationSecondaryColumnType || 'string',
        secondaryValue,
      );
      payload.push(
        `${CUSTOM_PAGINATION_SECONDARY_KEY}:${encodedSecondaryValue}`,
      );
    }

    return btoa(payload.join(','));
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
    if (key === CUSTOM_PAGINATION_SECONDARY_KEY) {
      return this.paginationSecondaryColumnType || 'string';
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

  private buildComparisonClause({
    dbType,
    columnName,
    paramName,
    operator,
  }: {
    dbType: DatabaseType;
    columnName: string;
    paramName: string;
    operator: string;
  }): string {
    if (dbType === DatabaseType.SQLITE3) {
      return `${columnName} ${operator} :${paramName}`;
    }

    if (dbType === DatabaseType.POSTGRES) {
      const type = this.getEntityPropertyType(paramName);
      if (this.isTimestampType(type)) {
        if (operator === '<') {
          return `${columnName} < :${paramName}::timestamptz`;
        }
        if (operator === '>') {
          return `${columnName} >= (:${paramName}::timestamptz + INTERVAL '1 millisecond')`;
        }
        if (operator === '=') {
          return `(${columnName} >= :${paramName}::timestamptz AND ${columnName} < (:${paramName}::timestamptz + INTERVAL '1 millisecond'))`;
        }
        return `${columnName} ${operator} :${paramName}::timestamptz`;
      }
      return `${columnName} ${operator} :${paramName}`;
    }

    throw new Error('Unsupported database type');
  }

  private isTimestampType(type: string): boolean {
    return (
      type === 'timestamp with time zone' ||
      type === 'datetime' ||
      type === 'date'
    );
  }

  private getSupportedDbType(): DatabaseType {
    const dbType = system.get(AppSystemProp.DB_TYPE);
    if (dbType === DatabaseType.SQLITE3 || dbType === DatabaseType.POSTGRES) {
      return dbType;
    }
    throw new Error('Unsupported database type');
  }

  private resolveCursorContext(cursors: CursorParam): CursorContext {
    const customPaginationColumnName = this.paginationColumnName;
    const hasCustomPaginationCursor =
      customPaginationColumnName !== null &&
      cursors[CUSTOM_PAGINATION_KEY] !== undefined;

    const primaryColumnName =
      hasCustomPaginationCursor && customPaginationColumnName
        ? customPaginationColumnName
        : `${this.alias}.${PAGINATION_KEY}`;
    const primaryParamName = hasCustomPaginationCursor
      ? CUSTOM_PAGINATION_KEY
      : PAGINATION_KEY;

    const hasCustomSecondaryCursor =
      this.paginationSecondaryColumnName !== null &&
      cursors[CUSTOM_PAGINATION_SECONDARY_KEY] !== undefined;

    if (hasCustomPaginationCursor && hasCustomSecondaryCursor) {
      return {
        primaryColumnName,
        primaryParamName,
        secondaryColumnName: this.paginationSecondaryColumnName,
        secondaryParamName: CUSTOM_PAGINATION_SECONDARY_KEY,
      };
    }

    return {
      primaryColumnName,
      primaryParamName,
      secondaryColumnName: null,
      secondaryParamName: null,
    };
  }

  private applySingleColumnCursorFilter(
    where: WhereExpressionBuilder,
    cursors: CursorParam,
    dbType: DatabaseType,
    operator: string,
    context: CursorContext,
  ): void {
    where.orWhere(
      this.buildComparisonClause({
        dbType,
        columnName: context.primaryColumnName,
        paramName: context.primaryParamName,
        operator,
      }),
      cursors,
    );
  }

  private applyCompositeCursorFilter(
    where: WhereExpressionBuilder,
    cursors: CursorParam,
    dbType: DatabaseType,
    operator: string,
    context: CursorContext,
  ): void {
    const {
      primaryColumnName,
      primaryParamName,
      secondaryColumnName,
      secondaryParamName,
    } = context;
    if (!secondaryColumnName || !secondaryParamName) {
      throw new Error('Pagination secondary context is not configured');
    }

    where.orWhere(
      this.buildComparisonClause({
        dbType,
        columnName: primaryColumnName,
        paramName: primaryParamName,
        operator,
      }),
      cursors,
    );

    // Lexicographic cursor compare: primary equals, then compare secondary key.
    where.orWhere(
      new Brackets((nestedWhere) => {
        nestedWhere.where(
          this.buildComparisonClause({
            dbType,
            columnName: primaryColumnName,
            paramName: primaryParamName,
            operator: '=',
          }),
          cursors,
        );
        nestedWhere.andWhere(
          this.buildComparisonClause({
            dbType,
            columnName: secondaryColumnName,
            paramName: secondaryParamName,
            operator,
          }),
          cursors,
        );
      }),
    );
  }

  private toPagingResult<Entity>(entities: Entity[]): PagingResult<Entity> {
    return {
      data: entities,
      cursor: this.getCursor(),
    };
  }
}
