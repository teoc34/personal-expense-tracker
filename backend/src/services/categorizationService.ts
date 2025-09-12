import { dbAll, dbGet } from '../database/init';

interface CategoryRule {
  id: number;
  name: string;
  keywords: string[];
}

/**
 * Automatically categorize a transaction based on description and amount
 */
export async function categorizeTransaction(
  description: string, 
  amount: number, 
  type: 'income' | 'expense'
): Promise<number | null> {
  try {
    // Get all categories
    const categories = await dbAll('SELECT * FROM categories');
    
    if (categories.length === 0) {
      return null;
    }

    // Normalize description for matching
    const normalizedDescription = description.toLowerCase().trim();

    // Define category matching rules
    const categoryRules = getCategoryRules(type);

    // Find best matching category
    let bestMatch: { category: any; score: number } | null = null;

    for (const category of categories) {
      const rule = categoryRules.find(r => r.name.toLowerCase() === category.name.toLowerCase());
      if (!rule) continue;

      const score = calculateMatchScore(normalizedDescription, rule.keywords, amount, type);
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { category, score };
      }
    }

    return bestMatch ? bestMatch.category.id : getDefaultCategoryId(type, categories);

  } catch (error) {
    console.error('Error in categorizeTransaction:', error);
    return null;
  }
}

/**
 * Calculate match score based on keyword matching and other factors
 */
function calculateMatchScore(description: string, keywords: string[], amount: number, type: string): number {
  let score = 0;

  // Check for keyword matches
  for (const keyword of keywords) {
    if (description.includes(keyword.toLowerCase())) {
      // Exact word match gets higher score
      if (description.includes(` ${keyword.toLowerCase()} `) || 
          description.startsWith(`${keyword.toLowerCase()} `) ||
          description.endsWith(` ${keyword.toLowerCase()}`)) {
        score += 10;
      } else {
        // Partial match gets lower score
        score += 5;
      }
    }
  }

  // Boost score for amount-based rules (optional enhancement)
  if (type === 'expense') {
    if (amount > 1000) {
      // Large expenses might be rent, car payments, etc.
      if (keywords.includes('rent') || keywords.includes('mortgage') || keywords.includes('car')) {
        score += 2;
      }
    } else if (amount < 50) {
      // Small expenses might be food, coffee, etc.
      if (keywords.includes('coffee') || keywords.includes('food') || keywords.includes('snack')) {
        score += 2;
      }
    }
  }

  return score;
}

/**
 * Get categorization rules for different transaction types
 */
function getCategoryRules(type: 'income' | 'expense'): CategoryRule[] {
  const expenseRules: CategoryRule[] = [
    {
      id: 1,
      name: 'Food & Dining',
      keywords: [
        'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonalds', 'subway', 'pizza',
        'grocery', 'supermarket', 'walmart', 'target', 'safeway', 'kroger',
        'food', 'dining', 'lunch', 'dinner', 'breakfast', 'takeout', 'delivery',
        'uber eats', 'doordash', 'grubhub', 'postmates'
      ]
    },
    {
      id: 2,
      name: 'Transportation',
      keywords: [
        'gas', 'fuel', 'shell', 'exxon', 'chevron', 'bp', 'mobil',
        'uber', 'lyft', 'taxi', 'bus', 'train', 'metro', 'parking',
        'car payment', 'auto', 'insurance', 'dmv', 'registration',
        'mechanic', 'repair', 'oil change', 'tire'
      ]
    },
    {
      id: 3,
      name: 'Shopping',
      keywords: [
        'amazon', 'ebay', 'shopping', 'mall', 'store', 'retail',
        'clothing', 'clothes', 'shoes', 'fashion', 'electronics',
        'best buy', 'apple store', 'costco', 'home depot', 'lowes'
      ]
    },
    {
      id: 4,
      name: 'Entertainment',
      keywords: [
        'netflix', 'spotify', 'hulu', 'disney', 'amazon prime',
        'movie', 'cinema', 'theater', 'concert', 'game', 'gaming',
        'steam', 'playstation', 'xbox', 'entertainment', 'fun',
        'bar', 'club', 'pub', 'drinks'
      ]
    },
    {
      id: 5,
      name: 'Bills & Utilities',
      keywords: [
        'electric', 'electricity', 'pge', 'utility', 'water', 'sewer',
        'internet', 'comcast', 'verizon', 'att', 'phone', 'cell',
        'rent', 'mortgage', 'loan', 'credit card', 'payment',
        'insurance', 'bill', 'subscription'
      ]
    },
    {
      id: 6,
      name: 'Healthcare',
      keywords: [
        'doctor', 'medical', 'hospital', 'pharmacy', 'cvs', 'walgreens',
        'dentist', 'dental', 'health', 'medicine', 'prescription',
        'clinic', 'urgent care', 'insurance'
      ]
    }
  ];

  const incomeRules: CategoryRule[] = [
    {
      id: 7,
      name: 'Income',
      keywords: [
        'salary', 'payroll', 'wage', 'income', 'deposit', 'direct deposit',
        'paycheck', 'pay', 'employer', 'work', 'freelance', 'consulting',
        'bonus', 'commission', 'refund', 'cashback', 'interest', 'dividend'
      ]
    }
  ];

  return type === 'expense' ? expenseRules : incomeRules;
}

/**
 * Get default category ID for transactions that don't match any rules
 */
function getDefaultCategoryId(type: 'income' | 'expense', categories: any[]): number | null {
  if (type === 'income') {
    const incomeCategory = categories.find(c => c.name.toLowerCase() === 'income');
    if (incomeCategory) return incomeCategory.id;
  }
  
  // Default to "Other" category
  const otherCategory = categories.find(c => c.name.toLowerCase() === 'other');
  return otherCategory ? otherCategory.id : null;
}

/**
 * Bulk categorize multiple transactions
 */
export async function categorizeMultipleTransactions(
  transactions: Array<{ description: string; amount: number; type: 'income' | 'expense' }>
): Promise<Array<{ categoryId: number | null; confidence: number }>> {
  const results = [];
  
  for (const transaction of transactions) {
    const categoryId = await categorizeTransaction(
      transaction.description, 
      transaction.amount, 
      transaction.type
    );
    
    // Calculate confidence score (simplified)
    const confidence = categoryId ? 0.8 : 0.0; // 80% confidence if categorized, 0% if not
    
    results.push({ categoryId, confidence });
  }
  
  return results;
}

/**
 * Learn from user corrections to improve categorization
 * This is a placeholder for future machine learning implementation
 */
export async function learnFromCorrection(
  description: string,
  amount: number,
  type: 'income' | 'expense',
  correctCategoryId: number
): Promise<void> {
  // TODO: Implement learning mechanism
  // This could store user corrections and improve categorization rules
  console.log(`Learning: "${description}" should be category ${correctCategoryId}`);
}

/**
 * Get categorization statistics
 */
export async function getCategorizationStats(): Promise<{
  totalTransactions: number;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
  accuracyRate: number;
}> {
  try {
    const totalTransactions = await dbGet('SELECT COUNT(*) as count FROM transactions');
    const categorizedTransactions = await dbGet('SELECT COUNT(*) as count FROM transactions WHERE category_id IS NOT NULL');
    
    const total = totalTransactions.count;
    const categorized = categorizedTransactions.count;
    const uncategorized = total - categorized;
    const accuracyRate = total > 0 ? (categorized / total) * 100 : 0;

    return {
      totalTransactions: total,
      categorizedTransactions: categorized,
      uncategorizedTransactions: uncategorized,
      accuracyRate
    };
  } catch (error) {
    console.error('Error getting categorization stats:', error);
    return {
      totalTransactions: 0,
      categorizedTransactions: 0,
      uncategorizedTransactions: 0,
      accuracyRate: 0
    };
  }
}