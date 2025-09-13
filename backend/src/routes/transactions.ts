import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init';

const router = express.Router();

// Get all transactions with optional filtering
router.get('/', (req, res) => {
  const { 
    startDate, 
    endDate, 
    category, 
    type, 
    limit = 100, 
    offset = 0 
  } = req.query;

  let query = `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (startDate) {
    query += ' AND t.date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND t.date <= ?';
    params.push(endDate);
  }
  
  if (category) {
    query += ' AND t.category_id = ?';
    params.push(category);
  }
  
  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
  }
  
  query += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string), parseInt(offset as string));

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
      return;
    }
    
    res.json({
      transactions: rows,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: rows.length === parseInt(limit as string)
      }
    });
  });
});

// Get transaction by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(
    `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.id = ?`,
    [id],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: 'Failed to fetch transaction' });
        return;
      }
      
      if (!row) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }
      
      res.json(row);
    }
  );
});

// Create new transaction
router.post('/', (req, res) => {
  const {
    date,
    description,
    amount,
    type,
    category_id,
    subcategory,
    account,
    reference
  } = req.body;

  if (!date || !description || !amount || !type) {
    res.status(400).json({ 
      error: 'Missing required fields: date, description, amount, type' 
    });
    return;
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO transactions 
     (id, date, description, amount, type, category_id, subcategory, account, reference, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, date, description, amount, type, category_id, subcategory, account, reference, now, now],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to create transaction' });
        return;
      }
      
      res.status(201).json({
        id,
        message: 'Transaction created successfully'
      });
    }
  );
});

// Update transaction
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    date,
    description,
    amount,
    type,
    category_id,
    subcategory,
    account,
    reference
  } = req.body;

  const now = new Date().toISOString();

  db.run(
    `UPDATE transactions 
     SET date = ?, description = ?, amount = ?, type = ?, category_id = ?, 
         subcategory = ?, account = ?, reference = ?, updated_at = ?
     WHERE id = ?`,
    [date, description, amount, type, category_id, subcategory, account, reference, now, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to update transaction' });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }
      
      res.json({ message: 'Transaction updated successfully' });
    }
  );
});

// Delete transaction
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM transactions WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: 'Failed to delete transaction' });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    
    res.json({ message: 'Transaction deleted successfully' });
  });
});

// Bulk create transactions (for uploaded bank extracts)
router.post('/bulk', (req, res) => {
  const { transactions } = req.body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    res.status(400).json({ error: 'Transactions array is required' });
    return;
  }

  const now = new Date().toISOString();
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // Process transactions in batches
  const batchSize = 50;
  const batches = [];
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    batches.push(transactions.slice(i, i + batchSize));
  }

  let processedBatches = 0;

  batches.forEach((batch, batchIndex) => {
    const stmt = db.prepare(`
      INSERT INTO transactions 
      (id, date, description, amount, type, category_id, subcategory, account, reference, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    batch.forEach((transaction: any) => {
      try {
        const id = uuidv4();
        stmt.run([
          id,
          transaction.date,
          transaction.description,
          transaction.amount,
          transaction.type,
          transaction.category_id,
          transaction.subcategory,
          transaction.account,
          transaction.reference,
          now,
          now
        ]);
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Transaction ${transaction.description}: ${error}`);
      }
    });

    stmt.finalize();
    processedBatches++;

    if (processedBatches === batches.length) {
      res.json({
        message: 'Bulk transaction creation completed',
        summary: {
          total: transactions.length,
          successful: successCount,
          failed: errorCount,
          errors: errors.slice(0, 10) // Limit error messages
        }
      });
    }
  });
});

// Get transaction statistics
router.get('/stats/summary', (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  const query = `
    SELECT 
      COUNT(*) as total_transactions,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
      AVG(CASE WHEN type = 'income' THEN amount ELSE NULL END) as avg_income,
      AVG(CASE WHEN type = 'expense' THEN amount ELSE NULL END) as avg_expense
    FROM transactions
    ${dateFilter}
  `;

  db.get(query, params, (err, row: any) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch transaction statistics' });
      return;
    }

    res.json({
      ...row,
      net_amount: (row.total_income || 0) - (row.total_expenses || 0)
    });
  });
});

export default router;

