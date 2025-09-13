import fs from 'fs';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import pdf from 'pdf-parse';
import moment from 'moment';

export interface RawTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  account?: string;
  reference?: string;
}

export async function parseBankExtract(filePath: string, mimeType: string): Promise<RawTransaction[]> {
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  
  switch (fileExtension) {
    case 'csv':
      return await parseCSV(filePath);
    case 'xlsx':
    case 'xls':
      return await parseExcel(filePath);
    case 'pdf':
      return await parsePDF(filePath);
    default:
      throw new Error(`Unsupported file format: ${fileExtension}`);
  }
}

async function parseCSV(filePath: string): Promise<RawTransaction[]> {
  return new Promise((resolve, reject) => {
    const transactions: RawTransaction[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const transaction = parseCSVRow(row);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          console.warn('Error parsing CSV row:', error, row);
        }
      })
      .on('end', () => {
        resolve(transactions);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

function parseCSVRow(row: any): RawTransaction | null {
  // Common CSV column names to look for
  const dateColumns = ['date', 'transaction_date', 'posting_date', 'value_date'];
  const descriptionColumns = ['description', 'memo', 'details', 'transaction_details', 'narration'];
  const amountColumns = ['amount', 'transaction_amount', 'debit', 'credit', 'balance'];
  
  let date = '';
  let description = '';
  let amount = 0;
  
  // Find date column
  for (const col of dateColumns) {
    if (row[col]) {
      date = row[col];
      break;
    }
  }
  
  // Find description column
  for (const col of descriptionColumns) {
    if (row[col]) {
      description = row[col];
      break;
    }
  }
  
  // Find amount column
  for (const col of amountColumns) {
    if (row[col]) {
      const amountStr = String(row[col]).replace(/[,$]/g, '');
      const parsedAmount = parseFloat(amountStr);
      if (!isNaN(parsedAmount)) {
        amount = parsedAmount;
        break;
      }
    }
  }
  
  if (!date || !description || amount === 0) {
    return null;
  }
  
  // Determine transaction type based on amount
  const type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';
  
  // Normalize date format
  const normalizedDate = normalizeDate(date);
  
  return {
    date: normalizedDate,
    description: description.trim(),
    amount: Math.abs(amount),
    type,
    account: row.account || row.account_number || undefined,
    reference: row.reference || row.transaction_id || undefined
  };
}

async function parseExcel(filePath: string): Promise<RawTransaction[]> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const transactions: RawTransaction[] = [];
    
    for (const row of jsonData as any[]) {
      try {
        const transaction = parseCSVRow(row); // Reuse CSV parsing logic
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.warn('Error parsing Excel row:', error, row);
      }
    }
    
    return transactions;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error}`);
  }
}

async function parsePDF(filePath: string): Promise<RawTransaction[]> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    // This is a simplified PDF parser - in a real application, you might need
    // more sophisticated PDF parsing libraries like pdf2pic or pdf-parse with
    // table extraction capabilities
    
    const lines = data.text.split('\n');
    const transactions: RawTransaction[] = [];
    
    for (const line of lines) {
      const transaction = parsePDFLine(line);
      if (transaction) {
        transactions.push(transaction);
      }
    }
    
    return transactions;
  } catch (error) {
    throw new Error(`Failed to parse PDF file: ${error}`);
  }
}

function parsePDFLine(line: string): RawTransaction | null {
  // This is a very basic PDF line parser
  // In practice, you'd need more sophisticated parsing based on your bank's PDF format
  
  const trimmedLine = line.trim();
  if (trimmedLine.length < 10) return null;
  
  // Look for patterns like: "2023-12-01 DESCRIPTION -$100.00"
  const datePattern = /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/;
  const amountPattern = /([+-]?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
  
  const dateMatch = trimmedLine.match(datePattern);
  const amountMatch = trimmedLine.match(amountPattern);
  
  if (!dateMatch || !amountMatch) return null;
  
  const date = normalizeDate(dateMatch[1]);
  const amountStr = amountMatch[1].replace(/[,$]/g, '');
  const amount = parseFloat(amountStr);
  
  if (isNaN(amount)) return null;
  
  const type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';
  
  // Extract description (everything between date and amount)
  const description = trimmedLine
    .replace(dateMatch[0], '')
    .replace(amountMatch[0], '')
    .replace(/[+-]/g, '')
    .trim();
  
  return {
    date,
    description,
    amount: Math.abs(amount),
    type
  };
}

function normalizeDate(dateStr: string): string {
  // Try different date formats and normalize to YYYY-MM-DD
  const formats = [
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'MM-DD-YYYY',
    'DD-MM-YYYY',
    'YYYY/MM/DD'
  ];
  
  for (const format of formats) {
    const momentDate = moment(dateStr, format, true);
    if (momentDate.isValid()) {
      return momentDate.format('YYYY-MM-DD');
    }
  }
  
  // If no format matches, try to parse as-is
  const fallbackDate = moment(dateStr);
  if (fallbackDate.isValid()) {
    return fallbackDate.format('YYYY-MM-DD');
  }
  
  throw new Error(`Unable to parse date: ${dateStr}`);
}

