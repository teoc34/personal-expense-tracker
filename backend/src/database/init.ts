import sqlite3 from 'sqlite3';
import path from 'path';

// Database path
const DB_PATH = path.join(__dirname, '../../data/expense_tracker.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH);

// Typed database wrapper functions
export const dbRun = (query: string, params: any[] = []): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

export const dbGet = (query: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err: Error | null, row: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export const dbAll = (query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err: Error | null, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

export { db };

export async function initializeDatabase(): Promise<void> {
  try {
    // Enable foreign keys
    await dbRun('PRAGMA foreign_keys = ON');

    // Create categories table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT DEFAULT 'folder',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table
    await dbRun(`
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
    await dbRun(`
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
      await dbRun(
        'INSERT OR IGNORE INTO categories (name, color, icon) VALUES (?, ?, ?)',
        [category.name, category.color, category.icon]
      );
    }

    console.log('✅ Database tables created successfully');
    console.log('✅ Default categories inserted');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}