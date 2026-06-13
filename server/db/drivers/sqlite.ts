import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import { join } from 'node:path';
import * as schema from '../schema';
import config from '../../config';

/**
 * Creates a better-sqlite3 connection and Drizzle client, applying
 * migrations for file-based databases or inline SQL for :memory:.
 */
export function createSqliteDriver(migrationsDir: string) {
  const sqlite = new Database(config.dbPath);

  if (!config.dbPath.startsWith(':memory:')) {
    sqlite.pragma('journal_mode = WAL');
  }
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  if (config.dbPath === ':memory:') {
    const journal = JSON.parse(
      fs.readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf-8'),
    ) as { entries: { tag: string }[] };
    for (const entry of journal.entries) {
      sqlite.exec(fs.readFileSync(join(migrationsDir, `${entry.tag}.sql`), 'utf-8'));
    }
  } else {
    drizzleMigrate(db, { migrationsFolder: migrationsDir });
  }

  return { sqlite, db };
}
