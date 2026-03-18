import { EntitySchema, ObjectLiteral } from 'typeorm';
import Paginator, { Order } from './paginator';

export type PagingQuery = {
  afterCursor?: string;
  beforeCursor?: string;
  limit?: number;
  order?: Order | 'ASC' | 'DESC';
};

type CustomPaginationColumnOptions = {
  columnPath: string;
  columnName: string;
  columnType?: string;
};

// Secondary custom pagination is only valid when primary custom pagination is configured.
type CustomPaginationColumns =
  | {
      customPaginationColumn?: never;
      customPaginationSecondaryColumn?: never;
    }
  | {
      customPaginationColumn: CustomPaginationColumnOptions;
      customPaginationSecondaryColumn?: CustomPaginationColumnOptions;
    };

export type PaginationOptions<Entity> = {
  entity: EntitySchema<Entity>;
  alias?: string;
  query?: PagingQuery;
} & CustomPaginationColumns;

export function buildPaginator<Entity extends ObjectLiteral>(
  options: PaginationOptions<Entity>,
): Paginator<Entity> {
  const {
    entity,
    query = {},
    alias = entity.options.name.toLowerCase(),
  } = options;

  const paginator = new Paginator<Entity>(entity);

  paginator.setAlias(alias);

  if (
    options.customPaginationSecondaryColumn &&
    !options.customPaginationColumn
  ) {
    throw new Error(
      'customPaginationSecondaryColumn requires customPaginationColumn',
    );
  }

  if (options.customPaginationColumn) {
    paginator.setPaginationColumn(
      options.customPaginationColumn.columnPath,
      options.customPaginationColumn.columnName,
      options.customPaginationColumn.columnType,
    );
  }

  if (options.customPaginationSecondaryColumn) {
    paginator.setPaginationSecondaryColumn(
      options.customPaginationSecondaryColumn.columnPath,
      options.customPaginationSecondaryColumn.columnName,
      options.customPaginationSecondaryColumn.columnType,
    );
  }

  if (query.afterCursor) {
    paginator.setAfterCursor(query.afterCursor);
  }

  if (query.beforeCursor) {
    paginator.setBeforeCursor(query.beforeCursor);
  }

  if (query.limit) {
    paginator.setLimit(query.limit);
  }

  if (query.order) {
    paginator.setOrder(query.order as Order);
  }

  return paginator;
}
