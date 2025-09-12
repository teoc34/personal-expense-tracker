"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const init_1 = require("../database/init");
const router = express_1.default.Router();
// Get all goals
router.get('/', async (req, res) => {
    try {
        const goals = await (0, init_1.dbAll)(`
      SELECT g.*, 
             c.name as category_name, 
             c.color as category_color,
             c.icon as category_icon,
             (g.current_amount / g.target_amount * 100) as progress_percentage,
             CASE 
               WHEN g.current_amount >= g.target_amount THEN 'completed'
               WHEN g.target_date < DATE('now') AND g.current_amount < g.target_amount THEN 'overdue'
               ELSE g.status
             END as calculated_status
      FROM goals g
      LEFT JOIN categories c ON g.category_id = c.id
      ORDER BY g.created_at DESC
    `);
        res.json(goals);
    }
    catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});
// Get goal by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const goal = await (0, init_1.dbGet)(`
      SELECT g.*, 
             c.name as category_name, 
             c.color as category_color,
             c.icon as category_icon,
             (g.current_amount / g.target_amount * 100) as progress_percentage
      FROM goals g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE g.id = ?
    `, [id]);
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        res.json(goal);
    }
    catch (error) {
        console.error('Error fetching goal:', error);
        res.status(500).json({ error: 'Failed to fetch goal' });
    }
});
// Create new goal
router.post('/', async (req, res) => {
    try {
        const { title, target_amount, current_amount = 0, category_id, target_date, status = 'active' } = req.body;
        if (!title || !target_amount || target_amount <= 0) {
            return res.status(400).json({ error: 'Title and valid target amount are required' });
        }
        if (!['active', 'completed', 'paused'].includes(status)) {
            return res.status(400).json({ error: 'Status must be active, completed, or paused' });
        }
        const result = await (0, init_1.dbRun)('INSERT INTO goals (title, target_amount, current_amount, category_id, target_date, status) VALUES (?, ?, ?, ?, ?, ?)', [title.trim(), target_amount, current_amount, category_id || null, target_date || null, status]);
        const newGoal = await (0, init_1.dbGet)(`
      SELECT g.*, 
             c.name as category_name, 
             c.color as category_color,
             c.icon as category_icon,
             (g.current_amount / g.target_amount * 100) as progress_percentage
      FROM goals g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE g.id = ?
    `, [result.lastID]);
        res.status(201).json(newGoal);
    }
    catch (error) {
        console.error('Error creating goal:', error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});
// Update goal
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, target_amount, current_amount, category_id, target_date, status } = req.body;
        const existingGoal = await (0, init_1.dbGet)('SELECT * FROM goals WHERE id = ?', [id]);
        if (!existingGoal) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        // Validate status if provided
        if (status && !['active', 'completed', 'paused'].includes(status)) {
            return res.status(400).json({ error: 'Status must be active, completed, or paused' });
        }
        await (0, init_1.dbRun)(`
      UPDATE goals 
      SET title = ?, target_amount = ?, current_amount = ?, category_id = ?, target_date = ?, status = ?
      WHERE id = ?
    `, [
            title?.trim() || existingGoal.title,
            target_amount || existingGoal.target_amount,
            current_amount !== undefined ? current_amount : existingGoal.current_amount,
            category_id !== undefined ? category_id : existingGoal.category_id,
            target_date !== undefined ? target_date : existingGoal.target_date,
            status || existingGoal.status,
            id
        ]);
        const updatedGoal = await (0, init_1.dbGet)(`
      SELECT g.*, 
             c.name as category_name, 
             c.color as category_color,
             c.icon as category_icon,
             (g.current_amount / g.target_amount * 100) as progress_percentage
      FROM goals g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE g.id = ?
    `, [id]);
        res.json(updatedGoal);
    }
    catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ error: 'Failed to update goal' });
    }
});
// Update goal progress
router.patch('/:id/progress', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        if (typeof amount !== 'number') {
            return res.status(400).json({ error: 'Amount must be a number' });
        }
        const existingGoal = await (0, init_1.dbGet)('SELECT * FROM goals WHERE id = ?', [id]);
        if (!existingGoal) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        const newCurrentAmount = Math.max(0, existingGoal.current_amount + amount);
        const newStatus = newCurrentAmount >= existingGoal.target_amount ? 'completed' : existingGoal.status;
        await (0, init_1.dbRun)('UPDATE goals SET current_amount = ?, status = ? WHERE id = ?', [newCurrentAmount, newStatus, id]);
        const updatedGoal = await (0, init_1.dbGet)(`
      SELECT g.*, 
             c.name as category_name, 
             c.color as category_color,
             c.icon as category_icon,
             (g.current_amount / g.target_amount * 100) as progress_percentage
      FROM goals g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE g.id = ?
    `, [id]);
        res.json(updatedGoal);
    }
    catch (error) {
        console.error('Error updating goal progress:', error);
        res.status(500).json({ error: 'Failed to update goal progress' });
    }
});
// Delete goal
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const existingGoal = await (0, init_1.dbGet)('SELECT * FROM goals WHERE id = ?', [id]);
        if (!existingGoal) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        await (0, init_1.dbRun)('DELETE FROM goals WHERE id = ?', [id]);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});
exports.default = router;
//# sourceMappingURL=goals.js.map