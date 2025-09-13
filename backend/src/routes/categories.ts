import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init';
import { createCustomCategory, getAllCategories } from '../services/categorizationService';

const router = express.Router();

// Get all categories
router.get('/', (req, res) => {
  const { type } = req.query;

  let query = 'SELECT * FROM categories';
  const params: any[] = [];

  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }

  query += ' ORDER BY name';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch categories' });
      return;
    }

    res.json(rows);
  });
});

// Get category by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM categories WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch category' });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json(row);
  });
});

// Create new category
router.post('/', async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;

    if (!name || !type) {
      res.status(400).json({ 
        error: 'Missing required fields: name, type' 
      });
      return;
    }

    if (!['income', 'expense'].includes(type)) {
      res.status(400).json({ 
        error: 'Type must be either "income" or "expense"' 
      });
      return;
    }

    const category = await createCustomCategory(
      name,
      type,
      color || '#3B82F6',
      icon || '📁'
    );

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Category with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
});

// Update category
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, color, icon } = req.body;

  db.run(
    'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?',
    [name, color, icon, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to update category' });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json({ message: 'Category updated successfully' });
    }
  );
});

// Delete category
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Check if category is being used by any transactions
  db.get(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
    [id],
    (err, row: any) => {
      if (err) {
        res.status(500).json({ error: 'Failed to check category usage' });
        return;
      }

      if (row.count > 0) {
        res.status(400).json({ 
          error: 'Cannot delete category that is being used by transactions' 
        });
        return;
      }

      // Check if it's a default category
      db.get(
        'SELECT is_default FROM categories WHERE id = ?',
        [id],
        (err, category: any) => {
          if (err) {
            res.status(500).json({ error: 'Failed to check category type' });
            return;
          }

          if (category.is_default) {
            res.status(400).json({ 
              error: 'Cannot delete default categories' 
            });
            return;
          }

          db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
            if (err) {
              res.status(500).json({ error: 'Failed to delete category' });
              return;
            }

            if (this.changes === 0) {
              res.status(404).json({ error: 'Category not found' });
              return;
            }

            res.json({ message: 'Category deleted successfully' });
          });
        }
      );
    }
  );
});

// Get category usage statistics
router.get('/:id/stats', (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params: any[] = [id];

  if (startDate && endDate) {
    dateFilter = 'AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  const query = `
    SELECT 
      COUNT(*) as transaction_count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount,
      MIN(amount) as min_amount,
      MAX(amount) as max_amount
    FROM transactions 
    WHERE category_id = ? ${dateFilter}
  `;

  db.get(query, params, (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch category statistics' });
      return;
    }

    res.json(row);
  });
});

// Get subcategories for a category
router.get('/:id/subcategories', (req, res) => {
  const { id } = req.params;

  db.all(
    'SELECT * FROM subcategories WHERE category_id = ? ORDER BY name',
    [id],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: 'Failed to fetch subcategories' });
        return;
      }

      res.json(rows);
    }
  );
});

// Create subcategory
router.post('/:id/subcategories', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Subcategory name is required' });
    return;
  }

  const subcategoryId = uuidv4();

  db.run(
    'INSERT INTO subcategories (id, category_id, name) VALUES (?, ?, ?)',
    [subcategoryId, id, name],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(409).json({ error: 'Subcategory with this name already exists' });
        } else {
          res.status(500).json({ error: 'Failed to create subcategory' });
        }
        return;
      }

      res.status(201).json({
        id: subcategoryId,
        category_id: id,
        name,
        message: 'Subcategory created successfully'
      });
    }
  );
});

export default router;

