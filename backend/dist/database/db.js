"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.setDatabase = setDatabase;
exports.runMigrations = runMigrations;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_sqlite_1 = require("node:sqlite");
const pg_1 = __importDefault(require("pg"));
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
class SqliteDatabase {
    db;
    constructor(filePath) {
        if (!filePath || filePath === ':memory:') {
            this.db = new node_sqlite_1.DatabaseSync(':memory:');
        }
        else {
            const resolved = node_path_1.default.resolve(process.cwd(), filePath);
            const dir = node_path_1.default.dirname(resolved);
            if (!node_fs_1.default.existsSync(dir)) {
                node_fs_1.default.mkdirSync(dir, { recursive: true });
            }
            this.db = new node_sqlite_1.DatabaseSync(resolved);
        }
        this.db.exec('PRAGMA foreign_keys = ON;');
    }
    isPostgres() {
        return false;
    }
    normalizeParams(params) {
        return params.map((p) => {
            if (p === undefined || p === null)
                return null;
            if (typeof p === 'boolean')
                return p ? 1 : 0;
            if (p instanceof Date)
                return p.toISOString();
            if (typeof p === 'object')
                return JSON.stringify(p);
            return p;
        });
    }
    normalizeSql(sql) {
        return sql.replace(/\$(\d+)/g, '?');
    }
    async query(sql, params = []) {
        try {
            const stmt = this.db.prepare(this.normalizeSql(sql));
            const rows = stmt.all(...this.normalizeParams(params));
            return rows;
        }
        catch (error) {
            logger_js_1.logger.error({ sql, params, error }, 'SQLite query error');
            throw error;
        }
    }
    async queryOne(sql, params = []) {
        try {
            const stmt = this.db.prepare(this.normalizeSql(sql));
            const row = stmt.get(...this.normalizeParams(params));
            return row ?? null;
        }
        catch (error) {
            logger_js_1.logger.error({ sql, params, error }, 'SQLite queryOne error');
            throw error;
        }
    }
    async execute(sql, params = []) {
        try {
            const stmt = this.db.prepare(this.normalizeSql(sql));
            const res = stmt.run(...this.normalizeParams(params));
            return { changes: Number(res.changes || 0) };
        }
        catch (error) {
            logger_js_1.logger.error({ sql, params, error }, 'SQLite execute error');
            throw error;
        }
    }
    async exec(sql) {
        this.db.exec(sql);
    }
    async close() {
        this.db.close();
    }
}
class PostgresDatabase {
    pool;
    constructor(connectionString) {
        this.pool = new pg_1.default.Pool({ connectionString });
    }
    isPostgres() {
        return true;
    }
    async query(sql, params = []) {
        const res = await this.pool.query(sql, params);
        return res.rows;
    }
    async queryOne(sql, params = []) {
        const res = await this.pool.query(sql, params);
        return res.rows[0] ?? null;
    }
    async execute(sql, params = []) {
        const res = await this.pool.query(sql, params);
        return { changes: res.rowCount ?? 0 };
    }
    async exec(sql) {
        await this.pool.query(sql);
    }
    async close() {
        await this.pool.end();
    }
}
let dbInstance = null;
function getDatabase() {
    if (!dbInstance) {
        if (index_js_1.config.DATABASE_URL && index_js_1.config.DATABASE_URL.startsWith('postgres')) {
            logger_js_1.logger.info('Connecting to PostgreSQL database');
            dbInstance = new PostgresDatabase(index_js_1.config.DATABASE_URL);
        }
        else {
            const dbPath = index_js_1.config.isTest ? ':memory:' : index_js_1.config.SQLITE_PATH;
            logger_js_1.logger.info({ dbPath }, 'Connecting to SQLite database');
            dbInstance = new SqliteDatabase(dbPath);
        }
    }
    return dbInstance;
}
function setDatabase(customDb) {
    dbInstance = customDb;
}
async function runMigrations() {
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
    logger_js_1.logger.info('Database schema initialized successfully');
}
//# sourceMappingURL=db.js.map