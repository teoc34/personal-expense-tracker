"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const init_1 = require("../database/init");
const router = express_1.default.Router();
// Get all transactions
router.get('/', async (req, res) => {
    try {
        const { category, type, startDate, endDate, page = 1, limit = 50 } = req.query;
        let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
        const params = [];
        if (category) {
            query += ' AND t.category_id = ?';
            params.push(category);
        }
        if (type) {
            query += ' AND t.type = ?';
            params.push(type);
        }
        if (startDate) {
            query += ' AND t.date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND t.date <= ?';
            params.push(endDate);
        }
        query += ' ORDER BY t.date DESC, t.created_at DESC';
        const offset = (Number(page) - 1) * Number(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(Number(limit), offset);
        const transactions = await (0, init_1.dbAll)(query, params);
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM transactions t WHERE 1=1';
        const countParams = [];
        let paramIndex = 0;
        if (category) {
            countQuery += ' AND t.category_id = ?';
            countParams.push(params[paramIndex++]);
        }
        if (type) {
            countQuery += ' AND t.type = ?';
            countParams.push(params[paramIndex++]);
        }
        if (startDate) {
            countQuery += ' AND t.date >= ?';
            countParams.push(params[paramIndex++]);
        }
        if (endDate) {
            countQuery += ' AND t.date <= ?';
            countParams.push(params[paramIndex++]);
        }
        const { total } = await (0, init_1.dbGet)(countQuery, countParams);
        res.json({
            transactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// Get transaction by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await (0, init_1.dbGet)(`SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`, [id]);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(transaction);
    }
    catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
});
// Create new transaction
router.post('/', async (req, res) => {
    try {
        const { amount, description, category_id, type, date } = req.body;
        if (!amount || !description || !type || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ error: 'Type must be income or expense' });
        }
        const result = await (0, init_1.dbRun)('INSERT INTO transactions (amount, description, category_id, type, date) VALUES (?, ?, ?, ?, ?)', [amount, description, category_id || null, type, date]);
        const newTransaction = await (0, init_1.dbGet)(`SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`, [result.lastID]);
        res.status(201).json(newTransaction);
    }
    catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});
// Update transaction
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, description, category_id, type, date } = req.body;
        const existingTransaction = await (0, init_1.dbGet)('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!existingTransaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        await (0, init_1.dbRun)('UPDATE transactions SET amount = ?, description = ?, category_id = ?, type = ?, date = ? WHERE id = ?', [amount, description, category_id || null, type, date, id]);
        const updatedTransaction = await (0, init_1.dbGet)(`SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`, [id]);
        res.json(updatedTransaction);
    }
    catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});
// Delete transaction
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const existingTransaction = await (0, init_1.dbGet)('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!existingTransaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        await (0, init_1.dbRun)('DELETE FROM transactions WHERE id = ?', [id]);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});
exports.default = router;
//# sourceMappingURL=transactions.js.map