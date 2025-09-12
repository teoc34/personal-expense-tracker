import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/init';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await dbAll(`
      SELECT c.*, 
             COUNT(t.id) as transaction_count,
             COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
             COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      GROUP BY c.id
      ORDER BY c.name
    `);

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await dbGet(`
      SELECT c.*, 
             COUNT(t.id) as transaction_count,
             COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
             COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create new category
router.post('/', async (req, res) => {
  try {
    const { name, color = '#3B82F6', icon = 'folder' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await dbRun(
      'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)',
      [name.trim(), color, icon]
    );

    const newCategory = await dbGet(
      'SELECT * FROM categories WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(newCategory);
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;

    const existingCategory = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await dbRun(
      'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?',
      [name?.trim() || existingCategory.name, color || existingCategory.color, icon || existingCategory.icon, id]
    );

    const updatedCategory = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(updatedCategory);
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingCategory = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has transactions
    const transactionCount = await dbGet(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      [id]
    );

    if (transactionCount.count > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete category with existing transactions. Please reassign or delete transactions first.' 
      });
    }

    await dbRun('DELETE FROM categories WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;