export interface IDatabase {
    query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
    queryOne<T = any>(sql: string, params?: unknown[]): Promise<T | null>;
    execute(sql: string, params?: unknown[]): Promise<{
        changes: number;
    }>;
    exec(sql: string): Promise<void>;
    close(): Promise<void>;
    isPostgres(): boolean;
}
export declare function getDatabase(): IDatabase;
export declare function setDatabase(customDb: IDatabase): void;
export declare function runMigrations(): Promise<void>;
