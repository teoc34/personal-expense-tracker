import { db } from '../database/init';
import { RawTransaction } from './fileParser';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  subcategory?: string;
}

export async function categorizeTransaction(transaction: RawTransaction): Promise<Category> {
  // First, try to find existing category based on description keywords
  const existingCategory = await findExistingCategory(transaction.description);
  if (existingCategory) {
    return existingCategory;
  }
  
  // If no existing category found, use AI-powered categorization
  const suggestedCategory = await suggestCategory(transaction.description, transaction.type);
  
  return suggestedCategory;
}

async function findExistingCategory(description: string): Promise<Category | null> {
  return new Promise((resolve, reject) => {
    // Get all categories
    db.all('SELECT * FROM categories', [], (err, categories: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Simple keyword matching for now
      const descriptionLower = description.toLowerCase();
      
      for (const category of categories) {
        const keywords = getCategoryKeywords(category.name);
        if (keywords.some(keyword => descriptionLower.includes(keyword))) {
          resolve({
            id: category.id,
            name: category.name,
            type: category.type,
            color: category.color,
            icon: category.icon
          });
          return;
        }
      }
      
      resolve(null);
    });
  });
}

async function suggestCategory(description: string, type: 'income' | 'expense'): Promise<Category> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM categories WHERE type = ? AND is_default = 1',
      [type],
      (err, categories: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Use AI-powered categorization logic
        const suggestedCategory = categorizeByAI(description, categories);
        resolve(suggestedCategory);
      }
    );
  });
}

function categorizeByAI(description: string, categories: any[]): Category {
  const descriptionLower = description.toLowerCase();
  
  // Enhanced keyword matching with weights
  const categoryScores: { [key: string]: number } = {};
  
  for (const category of categories) {
    const keywords = getCategoryKeywords(category.name);
    let score = 0;
    
    for (const keyword of keywords) {
      if (descriptionLower.includes(keyword)) {
        score += keyword.length; // Longer keywords get higher scores
      }
    }
    
    categoryScores[category.id] = score;
  }
  
  // Find the category with the highest score
  const bestCategoryId = Object.keys(categoryScores).reduce((a, b) => 
    categoryScores[a] > categoryScores[b] ? a : b
  );
  
  const bestCategory = categories.find(c => c.id === bestCategoryId);
  
  return {
    id: bestCategory.id,
    name: bestCategory.name,
    type: bestCategory.type,
    color: bestCategory.color,
    icon: bestCategory.icon
  };
}

function getCategoryKeywords(categoryName: string): string[] {
  const keywordMap: { [key: string]: string[] } = {
    'Salary': ['salary', 'wage', 'pay', 'payroll', 'income', 'employment'],
    'Freelance': ['freelance', 'contract', 'consulting', 'project', 'gig'],
    'Investment': ['dividend', 'interest', 'capital gains', 'investment', 'stocks', 'bonds'],
    'Other Income': ['refund', 'rebate', 'bonus', 'gift', 'cashback'],
    
    'Food & Dining': ['restaurant', 'food', 'dining', 'grocery', 'supermarket', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast'],
    'Transportation': ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'bus', 'train', 'metro', 'parking', 'toll', 'car', 'vehicle'],
    'Housing': ['rent', 'mortgage', 'housing', 'apartment', 'home', 'property', 'lease'],
    'Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'cable', 'utility', 'power', 'heating'],
    'Healthcare': ['doctor', 'hospital', 'pharmacy', 'medical', 'health', 'insurance', 'dental', 'clinic'],
    'Entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'game', 'entertainment', 'theater', 'concert'],
    'Shopping': ['amazon', 'store', 'shopping', 'retail', 'clothes', 'fashion', 'electronics'],
    'Education': ['school', 'university', 'course', 'book', 'education', 'tuition', 'learning'],
    'Savings': ['savings', 'deposit', 'investment', 'retirement', 'emergency fund'],
    'Other Expenses': ['misc', 'other', 'general', 'personal']
  };
  
  return keywordMap[categoryName] || [categoryName.toLowerCase()];
}

export async function createCustomCategory(name: string, type: 'income' | 'expense', color: string, icon: string): Promise<Category> {
  return new Promise((resolve, reject) => {
    const id = `custom-${type}-${Date.now()}`;
    
    db.run(
      'INSERT INTO categories (id, name, type, color, icon, is_default) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, type, color, icon, 0],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id,
            name,
            type,
            color,
            icon
          });
        }
      }
    );
  });
}

export async function getAllCategories(): Promise<Category[]> {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM categories ORDER BY name', [], (err, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type,
          color: row.color,
          icon: row.icon
        })));
      }
    });
  });
}

