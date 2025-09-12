import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';

/**
 * Format currency amount
 */
export const formatCurrency = (
  amount: number, 
  currency: string = 'USD',
  showSign: boolean = true
): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatted = formatter.format(Math.abs(amount));
  
  if (!showSign) {
    return formatted;
  }

  return amount >= 0 ? formatted : `-${formatted}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (
  value: number, 
  decimals: number = 1
): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format date string
 */
export const formatDate = (
  dateString: string | Date,
  formatStr: string = 'MMM dd, yyyy'
): string => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    
    if (!isValid(date)) {
      return 'Invalid Date';
    }

    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    
    if (!isValid(date)) {
      return 'Invalid Date';
    }

    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid Date';
  }
};

/**
 * Format large numbers with abbreviations (e.g., 1.5K, 2.3M)
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Get color class for transaction type
 */
export const getTransactionColor = (type: 'income' | 'expense'): string => {
  return type === 'income' ? 'text-success-600' : 'text-error-600';
};

/**
 * Get background color class for transaction type
 */
export const getTransactionBgColor = (type: 'income' | 'expense'): string => {
  return type === 'income' ? 'bg-success-100' : 'bg-error-100';
};

/**
 * Get icon for transaction type
 */
export const getTransactionIcon = (type: 'income' | 'expense'): string => {
  return type === 'income' ? 'trending-up' : 'trending-down';
};

/**
 * Get status color for goals
 */
export const getGoalStatusColor = (status: 'active' | 'completed' | 'paused'): string => {
  switch (status) {
    case 'completed':
      return 'text-success-600 bg-success-100';
    case 'paused':
      return 'text-warning-600 bg-warning-100';
    case 'active':
    default:
      return 'text-primary-600 bg-primary-100';
  }
};

/**
 * Get progress color based on percentage
 */
export const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return 'bg-success-500';
  if (percentage >= 75) return 'bg-primary-500';
  if (percentage >= 50) return 'bg-warning-500';
  return 'bg-gray-300';
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate random color
 */
export const generateRandomColor = (): string => {
  const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#F97316', '#84CC16', '#06B6D4', '#6366F1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Calculate days between dates
 */
export const daysBetween = (date1: string | Date, date2: string | Date): number => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if date is in the future
 */
export const isFutureDate = (dateString: string): boolean => {
  try {
    const date = parseISO(dateString);
    return date > new Date();
  } catch {
    return false;
  }
};

/**
 * Get current date in YYYY-MM-DD format
 */
export const getCurrentDateString = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};