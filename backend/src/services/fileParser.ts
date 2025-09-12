import csv from 'csv-parser';
import fs from 'fs';

interface ParsedTransaction {
  amount: number;
  description: string;
  type: 'income' | 'expense';
  date: string;
}

interface CSVRow {
  [key: string]: string;
}

/**
 * Parse CSV file and extract transaction data
 * Supports common CSV formats from banks and financial institutions
 */
export async function parseCSVFile(filePath: string, previewMode = false): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    const results: ParsedTransaction[] = [];
    const errors: string[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: CSVRow) => {
        try {
          const transaction = parseTransactionRow(row);
          if (transaction) {
            results.push(transaction);
            
            // In preview mode, limit to first 100 rows for performance
            if (previewMode && results.length >= 100) {
              return;
            }
          }
        } catch (error) {
          errors.push(`Row parsing error: ${error.message}`);
        }
      })
      .on('end', () => {
        if (results.length === 0 && errors.length > 0) {
          reject(new Error(`No valid transactions found. Errors: ${errors.join('; ')}`));
        } else {
          resolve(results);
        }
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      });
  });
}

/**
 * Parse a single CSV row into a transaction object
 * Handles various CSV formats and column names
 */
function parseTransactionRow(row: CSVRow): ParsedTransaction | null {
  // Normalize column names (make lowercase, remove spaces/special chars)
  const normalizedRow: { [key: string]: string } = {};
  Object.keys(row).forEach(key => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    normalizedRow[normalizedKey] = row[key];
  });

  // Try to extract amount
  const amount = extractAmount(normalizedRow);
  if (amount === null) {
    throw new Error('Could not parse amount from row');
  }

  // Try to extract description
  const description = extractDescription(normalizedRow);
  if (!description) {
    throw new Error('Could not parse description from row');
  }

  // Try to extract date
  const date = extractDate(normalizedRow);
  if (!date) {
    throw new Error('Could not parse date from row');
  }

  // Determine transaction type
  const type = determineTransactionType(normalizedRow, amount);

  return {
    amount: Math.abs(amount), // Always store positive amount
    description: description.trim(),
    type,
    date
  };
}

/**
 * Extract amount from various possible column names
 */
function extractAmount(row: { [key: string]: string }): number | null {
  const amountFields = [
    'amount', 'amt', 'value', 'sum', 'total',
    'debit', 'credit', 'transaction', 'transactionamount',
    'withdrawals', 'deposits', 'payment', 'charge'
  ];

  for (const field of amountFields) {
    if (row[field]) {
      const parsed = parseNumber(row[field]);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  // Try to find any field with numeric value
  for (const [key, value] of Object.entries(row)) {
    if (key.includes('amount') || key.includes('sum') || key.includes('total')) {
      const parsed = parseNumber(value);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Extract description from various possible column names
 */
function extractDescription(row: { [key: string]: string }): string | null {
  const descriptionFields = [
    'description', 'desc', 'memo', 'details', 'note', 'notes',
    'reference', 'ref', 'payee', 'merchant', 'vendor',
    'transactiondescription', 'narrative', 'particulars'
  ];

  for (const field of descriptionFields) {
    if (row[field] && row[field].trim()) {
      return row[field].trim();
    }
  }

  // Fallback: use the first non-empty field that looks like text
  for (const [key, value] of Object.entries(row)) {
    if (value && value.trim() && isNaN(parseFloat(value))) {
      return value.trim();
    }
  }

  return null;
}

/**
 * Extract date from various possible column names and formats
 */
function extractDate(row: { [key: string]: string }): string | null {
  const dateFields = [
    'date', 'transactiondate', 'postdate', 'valuedate',
    'datetime', 'timestamp', 'created', 'processed'
  ];

  for (const field of dateFields) {
    if (row[field]) {
      const parsed = parseDate(row[field]);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Determine if transaction is income or expense
 */
function determineTransactionType(row: { [key: string]: string }, amount: number): 'income' | 'expense' {
  // Check for explicit type columns
  const typeFields = ['type', 'transactiontype', 'category', 'debitcredit'];
  
  for (const field of typeFields) {
    if (row[field]) {
      const value = row[field].toLowerCase();
      if (value.includes('credit') || value.includes('deposit') || value.includes('income')) {
        return 'income';
      }
      if (value.includes('debit') || value.includes('withdrawal') || value.includes('expense')) {
        return 'expense';
      }
    }
  }

  // Check for separate debit/credit columns
  if (row['debit'] && parseNumber(row['debit']) !== null) {
    return 'expense';
  }
  if (row['credit'] && parseNumber(row['credit']) !== null) {
    return 'income';
  }

  // Default logic based on amount sign (if originally negative, it was likely an expense)
  return amount < 0 ? 'expense' : 'income';
}

/**
 * Parse a number from string, handling various formats
 */
function parseNumber(value: string): number | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Remove currency symbols, spaces, and commas
  const cleaned = value.replace(/[$€£¥₹,\s]/g, '');
  
  // Handle parentheses as negative (accounting format)
  const isNegative = cleaned.includes('(') && cleaned.includes(')');
  const withoutParens = cleaned.replace(/[()]/g, '');
  
  const parsed = parseFloat(withoutParens);
  
  if (isNaN(parsed)) {
    return null;
  }
  
  return isNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Parse date from string, handling various formats
 */
function parseDate(dateString: string): string | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  try {
    // Try parsing as standard date
    const date = new Date(dateString);
    
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }

    // Try common date formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        let year, month, day;
        
        if (format === formats[0]) { // MM/DD/YYYY format
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else if (format === formats[1]) { // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else { // DD-MM-YYYY format
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        }
        
        const parsedDate = new Date(year, month - 1, day);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}