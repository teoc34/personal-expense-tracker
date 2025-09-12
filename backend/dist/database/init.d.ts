import sqlite3 from 'sqlite3';
declare const db: sqlite3.Database;
declare const dbRun: (arg1: string) => Promise<unknown>;
declare const dbAll: (arg1: string) => Promise<unknown>;
declare const dbGet: (arg1: string) => Promise<unknown>;
export { db, dbRun, dbAll, dbGet };
export declare function initializeDatabase(): Promise<void>;
//# sourceMappingURL=init.d.ts.map