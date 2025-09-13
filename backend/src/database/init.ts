import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/expense_tracker.db');

export const db = new sqlite3.Database(dbPath);

export async function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create transactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          category_id TEXT,
          subcategory TEXT,
          account TEXT,
          reference TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id)
        )
      `);

      // Create categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          color TEXT DEFAULT '#3B82F6',
          icon TEXT DEFAULT '📁',
          is_default BOOLEAN DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create subcategories table
      db.run(`
        CREATE TABLE IF NOT EXISTS subcategories (
          id TEXT PRIMARY KEY,
          category_id TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id),
          UNIQUE(category_id, name)
        )
      `);

      // Create goals table
      db.run(`
        CREATE TABLE IF NOT EXISTS goals (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          target_amount REAL NOT NULL,
          current_amount REAL DEFAULT 0,
          target_date TEXT,
          monthly_contribution REAL,
          description TEXT,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create goal_transactions table (for tracking contributions)
      db.run(`
        CREATE TABLE IF NOT EXISTS goal_transactions (
          id TEXT PRIMARY KEY,
          goal_id TEXT NOT NULL,
          transaction_id TEXT NOT NULL,
          amount REAL NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (goal_id) REFERENCES goals (id),
          FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        )
      `);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status)`);

      // Insert default categories
      insertDefaultCategories()
        .then(() => {
          console.log('Database tables created successfully');
          resolve();
        })
        .catch(reject);
    });
  });
}

async function insertDefaultCategories(): Promise<void> {
  const defaultCategories = [
    // Income categories
    { id: 'income-salary', name: 'Salary', type: 'income', color: '#10B981', icon: '💰', is_default: 1 },
    { id: 'income-freelance', name: 'Freelance', type: 'income', color: '#10B981', icon: '💼', is_default: 1 },
    { id: 'income-investment', name: 'Investment', type: 'income', color: '#10B981', icon: '📈', is_default: 1 },
    { id: 'income-other', name: 'Other Income', type: 'income', color: '#10B981', icon: '💵', is_default: 1 },

    // Expense categories
    { id: 'expense-food', name: 'Food & Dining', type: 'expense', color: '#F59E0B', icon: '🍽️', is_default: 1 },
    { id: 'expense-transport', name: 'Transportation', type: 'expense', color: '#3B82F6', icon: '🚗', is_default: 1 },
    { id: 'expense-housing', name: 'Housing', type: 'expense', color: '#8B5CF6', icon: '🏠', is_default: 1 },
    { id: 'expense-utilities', name: 'Utilities', type: 'expense', color: '#EF4444', icon: '⚡', is_default: 1 },
    { id: 'expense-healthcare', name: 'Healthcare', type: 'expense', color: '#EC4899', icon: '🏥', is_default: 1 },
    { id: 'expense-entertainment', name: 'Entertainment', type: 'expense', color: '#F97316', icon: '🎬', is_default: 1 },
    { id: 'expense-shopping', name: 'Shopping', type: 'expense', color: '#84CC16', icon: '🛍️', is_default: 1 },
    { id: 'expense-education', name: 'Education', type: 'expense', color: '#06B6D4', icon: '📚', is_default: 1 },
    { id: 'expense-savings', name: 'Savings', type: 'expense', color: '#059669', icon: '💾', is_default: 1 },
    { id: 'expense-other', name: 'Other Expenses', type: 'expense', color: '#6B7280', icon: '📦', is_default: 1 }
  ];

  for (const category of defaultCategories) {
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO categories (id, name, type, color, icon, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
        [category.id, category.name, category.type, category.color, category.icon, category.is_default],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}

export function closeDatabase(): void {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
  });
}

