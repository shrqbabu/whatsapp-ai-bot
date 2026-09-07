import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface IDatabase {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  isPostgres(): boolean;
}

class SqliteDatabase implements IDatabase {
  private db: DatabaseSync;

  constructor(filePath?: string) {
    if (!filePath || filePath === ':memory:') {
      this.db = new DatabaseSync(':memory:');
    } else {
      const resolved = path.resolve(process.cwd(), filePath);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.db = new DatabaseSync(resolved);
    }
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  isPostgres(): boolean {
    return false;
  }

  private normalizeParams(params: unknown[]): (string | number | bigint | Uint8Array | null)[] {
    return params.map((p) => {
      if (p === undefined || p === null) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p instanceof Date) return p.toISOString();
      if (typeof p === 'object') return JSON.stringify(p);
      return p as string | number | bigint | Uint8Array;
    });
  }

  private normalizeSql(sql: string): string {
    return sql.replace(/\$(\d+)/g, '?');
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const stmt = this.db.prepare(this.normalizeSql(sql));
      const rows = stmt.all(...this.normalizeParams(params)) as T[];
      return rows;
    } catch (error) {
      logger.error({ sql, params, error }, 'SQLite query error');
      throw error;
    }
  }

  async queryOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
    try {
      const stmt = this.db.prepare(this.normalizeSql(sql));
      const row = stmt.get(...this.normalizeParams(params)) as T | undefined;
      return row ?? null;
    } catch (error) {
      logger.error({ sql, params, error }, 'SQLite queryOne error');
      throw error;
    }
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    try {
      const stmt = this.db.prepare(this.normalizeSql(sql));
      const res = stmt.run(...this.normalizeParams(params));
      return { changes: Number(res.changes || 0) };
    } catch (error) {
      logger.error({ sql, params, error }, 'SQLite execute error');
      throw error;
    }
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

class PostgresDatabase implements IDatabase {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  isPostgres(): boolean {
    return true;
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query(sql, params as any[]);
    return (res.rows as unknown) as T[];
  }

  async queryOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
    const res = await this.pool.query(sql, params as any[]);
    return ((res.rows[0] as unknown) as T) ?? null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const res = await this.pool.query(sql, params as any[]);
    return { changes: res.rowCount ?? 0 };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

let dbInstance: IDatabase | null = null;

export function getDatabase(): IDatabase {
  if (!dbInstance) {
    if (config.DATABASE_URL && config.DATABASE_URL.startsWith('postgres')) {
      logger.info('Connecting to PostgreSQL database');
      dbInstance = new PostgresDatabase(config.DATABASE_URL);
    } else {
      const dbPath = config.isTest ? ':memory:' : config.SQLITE_PATH;
      logger.info({ dbPath }, 'Connecting to SQLite database');
      dbInstance = new SqliteDatabase(dbPath);
    }
  }
  return dbInstance!;
}

export function setDatabase(customDb: IDatabase): void {
  dbInstance = customDb;
}

export async function runMigrations(): Promise<void> {
  const db = getDatabase();
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      phone_number TEXT,
      status TEXT NOT NULL DEFAULT 'DISCONNECTED',
      connected_at TEXT,
      last_seen_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);

    CREATE TABLE IF NOT EXISTS ai_settings (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      system_prompt TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      reply_delay INTEGER NOT NULL DEFAULT 3,
      debounce_delay INTEGER NOT NULL DEFAULT 2,
      groups_enabled INTEGER NOT NULL DEFAULT 0,
      reply_only_when_mentioned INTEGER NOT NULL DEFAULT 0,
      business_hours_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      wa_jid TEXT NOT NULL,
      display_name TEXT,
      phone_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(session_id, wa_jid)
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_session_jid ON contacts(session_id, wa_jid);

    CREATE TABLE IF NOT EXISTS contact_rules (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      ai_enabled INTEGER NOT NULL DEFAULT 1,
      blocked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      UNIQUE(session_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS group_rules (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      group_jid TEXT NOT NULL,
      ai_enabled INTEGER NOT NULL DEFAULT 0,
      reply_only_when_mentioned INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(session_id, group_jid)
    );

    CREATE TABLE IF NOT EXISTS business_hours (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      start_time TEXT NOT NULL DEFAULT '09:00',
      end_time TEXT NOT NULL DEFAULT '18:00',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      outside_hours_action TEXT NOT NULL DEFAULT 'DO_NOTHING',
      outside_hours_message TEXT DEFAULT 'We are currently outside our business hours.',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(session_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      contact_id TEXT,
      chat_jid TEXT NOT NULL,
      chat_name TEXT,
      is_group INTEGER NOT NULL DEFAULT 0,
      takeover_active INTEGER NOT NULL DEFAULT 0,
      takeover_until TEXT,
      last_message_at TEXT,
      last_message_preview TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(session_id, chat_jid)
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user_session ON conversations(user_id, session_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(session_id, last_message_at);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      wa_message_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      sender TEXT NOT NULL,
      receiver TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      text TEXT,
      is_from_me INTEGER NOT NULL DEFAULT 0,
      ai_generated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(session_id, wa_message_id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_wa_id ON messages(session_id, wa_message_id);
  `;

  await db.exec(schemaSql);
  logger.info('Database schema initialized successfully');
}
