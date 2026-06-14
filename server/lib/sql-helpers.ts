import { sql } from 'drizzle-orm';

export type Dialect = 'postgres';

/**
 * Returns a Postgres JSON array aggregation SQL fragment.
 */
export function jsonGroupAgg(col: string, _dialect: Dialect) {
  return sql`COALESCE(json_agg(${sql.raw(col)})::text, '[]')`.mapWith(String);
}

/** Always true — kept for API compatibility with repos that still check. */
export function isPostgres(_dialect: Dialect): boolean {
  return true;
}
