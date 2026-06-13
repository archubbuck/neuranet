import { sql } from 'drizzle-orm';

export type Dialect = 'sqlite' | 'postgres';

/**
 * Returns a dialect-aware JSON array aggregation SQL fragment.
 * SQLite: json_group_array(col)
 * Postgres: json_agg(col)::text
 */
export function jsonGroupAgg(col: string, dialect: Dialect) {
  if (dialect === 'postgres') {
    return sql`COALESCE(json_agg(${sql.raw(col)})::text, '[]')`.mapWith(String);
  }
  return sql`COALESCE(json_group_array(${sql.raw(col)}), '[]')`.mapWith(String);
}

/**
 * SQLite-only UPDATE OR IGNORE. Postgres uses ON CONFLICT DO NOTHING,
 * but that only works for INSERTs. For UPDATEs, we must check existence
 * first, or use a CTE-based approach.
 *
 * Since our merge operation uses UPDATE OR IGNORE to handle the
 * UNIQUE(source_slug, target_slug) constraint on edges, the Postgres
 * equivalent is to delete conflicting rows first, then INSERT.
 *
 * This helper is only needed for UPDATE operations where OR IGNORE
 * semantics are required. Callers should check the dialect and use
 * alternative logic for Postgres.
 */
export function isPostgres(dialect: Dialect): boolean {
  return dialect === 'postgres';
}
