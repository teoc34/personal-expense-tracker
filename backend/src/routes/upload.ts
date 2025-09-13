import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { parseBankExtract } from '../services/fileParser';
import { categorizeTransaction } from '../services/categorizationService';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, and PDF files are allowed.'));
    }
  }
});

// Upload and parse bank extract
router.post('/bank-extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    console.log(`Processing file: ${fileName} (${fileType})`);

    // Parse the bank extract
    const rawTransactions = await parseBankExtract(filePath, fileType);
    
    if (!rawTransactions || rawTransactions.length === 0) {
      return res.status(400).json({ 
        error: 'No transactions found in the file or file format not supported' 
      });
    }

    // Categorize transactions
    const categorizedTransactions = await Promise.all(
      rawTransactions.map(async (transaction) => {
        const category = await categorizeTransaction(transaction);
        return {
          ...transaction,
          category_id: category.id,
          subcategory: category.subcategory
        };
      })
    );

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Successfully processed ${categorizedTransactions.length} transactions`,
      transactions: categorizedTransactions,
      summary: {
        totalTransactions: categorizedTransactions.length,
        incomeTransactions: categorizedTransactions.filter(t => t.type === 'income').length,
        expenseTransactions: categorizedTransactions.filter(t => t.type === 'expense').length,
        totalIncome: categorizedTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: categorizedTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
      }
    });

  } catch (error) {
    console.error('Error processing bank extract:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Failed to process bank extract',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get supported file formats
router.get('/supported-formats', (req, res) => {
  res.json({
    supportedFormats: [
      {
        type: 'CSV',
        extension: '.csv',
        description: 'Comma-separated values file',
        example: 'bank_statement.csv'
      },
      {
        type: 'Excel',
        extension: '.xlsx, .xls',
        description: 'Microsoft Excel spreadsheet',
        example: 'bank_statement.xlsx'
      },
      {
        type: 'PDF',
        extension: '.pdf',
        description: 'Portable Document Format',
        example: 'bank_statement.pdf'
      }
    ],
    requirements: [
      'File must contain transaction data with dates, descriptions, and amounts',
      'Maximum file size: 10MB',
      'CSV files should have headers in the first row',
      'PDF files should contain tabular data that can be extracted'
    ]
  });
});

export default router;

