"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fileParser_1 = require("../services/fileParser");
const categorizationService_1 = require("../services/categorizationService");
const init_1 = require("../database/init");
const router = express_1.default.Router();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../uploads/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            path_1.default.extname(file.originalname).toLowerCase() === '.csv') {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    }
});
// Upload and process CSV file
router.post('/csv', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { auto_categorize = 'true' } = req.body;
        const filePath = req.file.path;
        // Parse the CSV file
        const transactions = await (0, fileParser_1.parseCSVFile)(filePath);
        if (transactions.length === 0) {
            return res.status(400).json({ error: 'No valid transactions found in the file' });
        }
        // Process transactions
        const processedTransactions = [];
        const errors = [];
        for (let i = 0; i < transactions.length; i++) {
            try {
                const transaction = transactions[i];
                // Auto-categorize if requested
                let categoryId = null;
                if (auto_categorize === 'true') {
                    categoryId = await (0, categorizationService_1.categorizeTransaction)(transaction.description, transaction.amount, transaction.type);
                }
                // Insert transaction into database
                const result = await (0, init_1.dbRun)('INSERT INTO transactions (amount, description, category_id, type, date) VALUES (?, ?, ?, ?, ?)', [transaction.amount, transaction.description, categoryId, transaction.type, transaction.date]);
                // Get the created transaction with category info
                const createdTransaction = await (0, init_1.dbGet)(`
          SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.id = ?
        `, [result.lastID]);
                processedTransactions.push(createdTransaction);
            }
            catch (error) {
                errors.push({
                    row: i + 1,
                    transaction: transactions[i],
                    error: error.message
                });
            }
        }
        // Clean up uploaded file
        const fs = require('fs');
        fs.unlinkSync(filePath);
        res.json({
            success: true,
            processed_count: processedTransactions.length,
            error_count: errors.length,
            transactions: processedTransactions,
            errors: errors
        });
    }
    catch (error) {
        console.error('Error processing CSV upload:', error);
        // Clean up file on error
        if (req.file) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            }
            catch (e) {
                console.error('Error deleting uploaded file:', e);
            }
        }
        res.status(500).json({ error: 'Failed to process CSV file: ' + error.message });
    }
});
// Get upload history/status
router.get('/history', async (req, res) => {
    try {
        // For now, we'll return basic info since we're not storing upload history
        // In a more complete implementation, you'd want to track uploads in the database
        res.json({
            message: 'Upload history feature coming soon',
            recent_uploads: []
        });
    }
    catch (error) {
        console.error('Error fetching upload history:', error);
        res.status(500).json({ error: 'Failed to fetch upload history' });
    }
});
// Validate CSV format (preview without saving)
router.post('/validate', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const filePath = req.file.path;
        // Parse the CSV file (preview mode)
        const transactions = await (0, fileParser_1.parseCSVFile)(filePath, true); // Pass true for preview mode
        // Clean up uploaded file
        const fs = require('fs');
        fs.unlinkSync(filePath);
        res.json({
            valid: true,
            preview: transactions.slice(0, 5), // Show first 5 transactions as preview
            total_count: transactions.length,
            columns_detected: transactions.length > 0 ? Object.keys(transactions[0]) : []
        });
    }
    catch (error) {
        console.error('Error validating CSV:', error);
        // Clean up file on error
        if (req.file) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            }
            catch (e) {
                console.error('Error deleting uploaded file:', e);
            }
        }
        res.status(400).json({
            valid: false,
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map