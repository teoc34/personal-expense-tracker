"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.dbAll = exports.dbGet = exports.dbRun = void 0;
exports.initializeDatabase = initializeDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
// Database path
const DB_PATH = path_1.default.join(__dirname, '../../data/expense_tracker.db');
// Create database connection
const db = new sqlite3_1.default.Database(DB_PATH);
exports.db = db;
// Typed database wrapper functions
const dbRun = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve(this);
            }
        });
    });
};
exports.dbRun = dbRun;
const dbGet = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
};
exports.dbGet = dbGet;
const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows || []);
            }
        });
    });
};
exports.dbAll = dbAll;
async function initializeDatabase() {
    try {
        // Enable foreign keys
        await (0, exports.dbRun)('PRAGMA foreign_keys = ON');
        // Create categories table
        await (0, exports.dbRun)(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT DEFAULT 'folder',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create transactions table
        await (0, exports.dbRun)(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT NOT NULL,
        category_id INTEGER,
        type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
        date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )
    `);
        // Create goals table
        await (0, exports.dbRun)(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        target_amount DECIMAL(10, 2) NOT NULL,
        current_amount DECIMAL(10, 2) DEFAULT 0,
        category_id INTEGER,
        target_date DATE,
        status TEXT CHECK(status IN ('active', 'completed', 'paused')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )
    `);
        // Insert default categories if they don't exist
        const defaultCategories = [
            { name: 'Food & Dining', color: '#EF4444', icon: 'utensils' },
            { name: 'Transportation', color: '#F59E0B', icon: 'car' },
            { name: 'Shopping', color: '#8B5CF6', icon: 'shopping-bag' },
            { name: 'Entertainment', color: '#EC4899', icon: 'film' },
            { name: 'Bills & Utilities', color: '#6B7280', icon: 'receipt' },
            { name: 'Healthcare', color: '#10B981', icon: 'heart' },
            { name: 'Income', color: '#059669', icon: 'trending-up' },
            { name: 'Other', color: '#6B7280', icon: 'more-horizontal' }
        ];
        for (const category of defaultCategories) {
            await (0, exports.dbRun)('INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)', [category.name, category.color, category.icon]);
        }
        console.log('✅ Database tables created successfully');
        console.log('✅ Default categories inserted');
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}
//# sourceMappingURL=init.js.map