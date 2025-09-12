/**
 * Automatically categorize a transaction based on description and amount
 */
export declare function categorizeTransaction(description: string, amount: number, type: 'income' | 'expense'): Promise<number | null>;
/**
 * Bulk categorize multiple transactions
 */
export declare function categorizeMultipleTransactions(transactions: Array<{
    description: string;
    amount: number;
    type: 'income' | 'expense';
}>): Promise<Array<{
    categoryId: number | null;
    confidence: number;
}>>;
/**
 * Learn from user corrections to improve categorization
 * This is a placeholder for future machine learning implementation
 */
export declare function learnFromCorrection(description: string, amount: number, type: 'income' | 'expense', correctCategoryId: number): Promise<void>;
/**
 * Get categorization statistics
 */
export declare function getCategorizationStats(): Promise<{
    totalTransactions: number;
    categorizedTransactions: number;
    uncategorizedTransactions: number;
    accuracyRate: number;
}>;
//# sourceMappingURL=categorizationService.d.ts.map