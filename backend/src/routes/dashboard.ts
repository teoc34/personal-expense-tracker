import express from 'express';
import { dbAll, dbGet } from '../database/init';

const router = express.Router();

// Get dashboard data
router.get('/', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND t.date >= DATE('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND t.date >= DATE('now', '-1 month')";
        break;
      case 'year':
        dateFilter = "AND t.date >= DATE('now', '-1 year')";
        break;
      case 'all':
        dateFilter = '';
        break;
      default:
        dateFilter = "AND t.date >= DATE('now', '-1 month')";
    }

    // Get total income and expenses for the period
    const totals = await dbGet(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) as total_transactions
      FROM transactions t
      WHERE 1=1 ${dateFilter}
    `);

    // Get spending by category for the period
    const categorySpending = await dbAll(`
      SELECT 
        c.name,
        c.color,
        c.icon,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COUNT(t.id) as transaction_count
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.type = 'expense' ${dateFilter}
      GROUP BY c.id, c.name, c.color, c.icon
      HAVING total_amount > 0
      ORDER BY total_amount DESC
    `);

    // Get recent transactions (last 10)
    const recentTransactions = await dbAll(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 10
    `);

    // Get daily spending trend for charts (last 30 days)
    const dailyTrend = await dbAll(`
      SELECT 
        DATE(t.date) as date,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
      FROM transactions t
      WHERE t.date >= DATE('now', '-30 days')
      GROUP BY DATE(t.date)
      ORDER BY DATE(t.date)
    `);

    // Get monthly comparison (current month vs previous month)
    const currentMonth = await dbGet(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
      FROM transactions t
      WHERE DATE(t.date) >= DATE('now', 'start of month')
    `);

    const previousMonth = await dbGet(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
      FROM transactions t
      WHERE DATE(t.date) >= DATE('now', 'start of month', '-1 month')
        AND DATE(t.date) < DATE('now', 'start of month')
    `);

    // Get active goals summary
    const goalsSummary = await dbAll(`
      SELECT 
        COUNT(*) as total_goals,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_goals,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_goals,
        COALESCE(AVG(CASE WHEN status = 'active' THEN (current_amount / target_amount * 100) END), 0) as avg_progress
      FROM goals
    `);

    // Calculate net income for the period
    const netIncome = totals.total_income - totals.total_expenses;
    
    // Calculate month-over-month changes
    const incomeChange = previousMonth.income > 0 
      ? ((currentMonth.income - previousMonth.income) / previousMonth.income * 100) 
      : 0;
    const expenseChange = previousMonth.expenses > 0 
      ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses * 100) 
      : 0;

    const dashboardData = {
      summary: {
        total_income: totals.total_income,
        total_expenses: totals.total_expenses,
        net_income: netIncome,
        total_transactions: totals.total_transactions,
        savings_rate: totals.total_income > 0 ? (netIncome / totals.total_income * 100) : 0
      },
      comparison: {
        current_month: currentMonth,
        previous_month: previousMonth,
        income_change: incomeChange,
        expense_change: expenseChange
      },
      category_spending: categorySpending,
      recent_transactions: recentTransactions,
      daily_trend: dailyTrend,
      goals_summary: goalsSummary[0] || {
        total_goals: 0,
        active_goals: 0,
        completed_goals: 0,
        avg_progress: 0
      },
      period: period
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get spending analytics
router.get('/analytics', async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params: any[] = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND t.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      dateFilter = "AND t.date >= DATE('now', '-3 months')";
    }

    let categoryFilter = '';
    if (category) {
      categoryFilter = 'AND t.category_id = ?';
      params.push(category);
    }

    // Weekly spending pattern
    const weeklyPattern = await dbAll(`
      SELECT 
        CASE CAST(strftime('%w', t.date) AS INTEGER)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_of_week,
        CAST(strftime('%w', t.date) AS INTEGER) as day_number,
        AVG(t.amount) as avg_amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      WHERE t.type = 'expense' ${dateFilter} ${categoryFilter}
      GROUP BY CAST(strftime('%w', t.date) AS INTEGER)
      ORDER BY day_number
    `, params);

    // Monthly spending trend
    const monthlyTrend = await dbAll(`
      SELECT 
        strftime('%Y-%m', t.date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        COUNT(*) as transaction_count
      FROM transactions t
      WHERE 1=1 ${dateFilter} ${categoryFilter}
      GROUP BY strftime('%Y-%m', t.date)
      ORDER BY month
    `, params);

    // Top spending days
    const topSpendingDays = await dbAll(`
      SELECT 
        DATE(t.date) as date,
        SUM(t.amount) as total_amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      WHERE t.type = 'expense' ${dateFilter} ${categoryFilter}
      GROUP BY DATE(t.date)
      ORDER BY total_amount DESC
      LIMIT 10
    `, params);

    res.json({
      weekly_pattern: weeklyPattern,
      monthly_trend: monthlyTrend,
      top_spending_days: topSpendingDays
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

export default router;