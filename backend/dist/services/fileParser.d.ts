interface ParsedTransaction {
    amount: number;
    description: string;
    type: 'income' | 'expense';
    date: string;
}
/**
 * Parse CSV file and extract transaction data
 * Supports common CSV formats from banks and financial institutions
 */
export declare function parseCSVFile(filePath: string, previewMode?: boolean): Promise<ParsedTransaction[]>;
export {};
//# sourceMappingURL=fileParser.d.ts.map