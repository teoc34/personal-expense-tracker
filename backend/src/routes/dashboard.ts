import express from 'express';
import moment from 'moment';
import { db } from '../database/init';

const router = express.Router();

// Get dashboard overview
router.get('/overview', (req, res) => {
  const { period = 'month' } = req.query;
  
  let startDate: string;
  let endDate: string;
  
  switch (period) {
    case 'week':
      startDate = moment().startOf('week').format('YYYY-MM-DD');
      endDate = moment().endOf('week').format('YYYY-MM-DD');
      break;
    case 'month':
      startDate = moment().startOf('month').format('YYYY-MM-DD');
      endDate = moment().endOf('month').format('YYYY-MM-DD');
      break;
    case 'year':
      startDate = moment().startOf('year').format('YYYY-MM-DD');
      endDate = moment().endOf('year').format('YYYY-MM-DD');
      break;
    default:
      startDate = moment().startOf('month').format('YYYY-MM-DD');
      endDate = moment().endOf('month').format('YYYY-MM-DD');
  }

  // Get transaction summary
  const transactionQuery = `
    SELECT 
      COUNT(*) as total_transactions,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
      AVG(CASE WHEN type = 'income' THEN amount ELSE NULL END) as avg_income,
      AVG(CASE WHEN type = 'expense' THEN amount ELSE NULL END) as avg_expense
    FROM transactions 
    WHERE date BETWEEN ? AND ?
  `;

  // Get category breakdown
  const categoryQuery = `
    SELECT 
      c.name as category_name,
      c.color as category_color,
      c.icon as category_icon,
      COUNT(t.id) as transaction_count,
      SUM(t.amount) as total_amount,
      AVG(t.amount) as avg_amount
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id AND t.date BETWEEN ? AND ?
    GROUP BY c.id, c.name, c.color, c.icon
    HAVING transaction_count > 0
    ORDER BY total_amount DESC
  `;

  // Get goals summary
  const goalsQuery = `
    SELECT 
      COUNT(*) as total_goals,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_goals,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_goals,
      SUM(target_amount) as total_target_amount,
      SUM(current_amount) as total_current_amount
    FROM goals
  `;

  db.get(transactionQuery, [startDate, endDate], (err, transactionStats: any) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch transaction statistics' });
      return;
    }

    db.all(categoryQuery, [startDate, endDate], (err, categoryStats: any) => {
      if (err) {
        res.status(500).json({ error: 'Failed to fetch category statistics' });
        return;
      }

      db.get(goalsQuery, [], (err, goalsStats: any) => {
        if (err) {
          res.status(500).json({ error: 'Failed to fetch goals statistics' });
          return;
        }

        res.json({
          period: {
            type: period,
            start_date: startDate,
            end_date: endDate
          },
          transactions: {
            ...transactionStats,
            net_amount: (transactionStats.total_income || 0) - (transactionStats.total_expenses || 0)
          },
          categories: categoryStats,
          goals: {
            ...goalsStats,
            progress_percentage: goalsStats.total_target_amount > 0 
              ? (goalsStats.total_current_amount / goalsStats.total_target_amount) * 100 
              : 0
          }
        });
      });
    });
  });
});

// Get spending trends
router.get('/trends', (req, res) => {
  const { months = 6 } = req.query;
  
  const startDate = moment().subtract(parseInt(months as string), 'months').startOf('month').format('YYYY-MM-DD');
  const endDate = moment().endOf('month').format('YYYY-MM-DD');

  const query = `
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
      COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
      COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
    FROM transactions 
    WHERE date BETWEEN ? AND ?
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month
  `;

  db.all(query, [startDate, endDate], (err, rows: any) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch spending trends' });
      return;
    }

    res.json({
      period: {
        months: parseInt(months as string),
        start_date: startDate,
        end_date: endDate
      },
      trends: rows.map((row: any) => ({
        ...row,
        net_amount: row.income - row.expenses
      }))
    });
  });
});

// Get top categories
router.get('/top-categories', (req, res) => {
  const { period = 'month', limit = 10 } = req.query;
  
  let startDate: string;
  let endDate: string;
  
  switch (period) {
    case 'week':
      startDate = moment().startOf('week').format('YYYY-MM-DD');
      endDate = moment().endOf('week').format('YYYY-MM-DD');
      break;
    case 'month':
      startDate = moment().startOf('month').format('YYYY-MM-DD');
      endDate = moment().endOf('month').format('YYYY-MM-DD');
      break;
    case 'year':
      startDate = moment().startOf('year').format('YYYY-MM-DD');
      endDate = moment().endOf('year').format('YYYY-MM-DD');
      break;
    default:
      startDate = moment().startOf('month').format('YYYY-MM-DD');
      endDate = moment().endOf('month').format('YYYY-MM-DD');
  }

  const query = `
    SELECT 
      c.name as category_name,
      c.color as category_color,
      c.icon as category_icon,
      c.type as category_type,
      COUNT(t.id) as transaction_count,
      SUM(t.amount) as total_amount,
      AVG(t.amount) as avg_amount,
      MIN(t.amount) as min_amount,
      MAX(t.amount) as max_amount
    FROM categories c
    INNER JOIN transactions t ON c.id = t.category_id
    WHERE t.date BETWEEN ? AND ?
    GROUP BY c.id, c.name, c.color, c.icon, c.type
    ORDER BY total_amount DESC
    LIMIT ?
  `;

  db.all(query, [startDate, endDate, parseInt(limit as string)], (err, rows: any) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch top categories' });
      return;
    }

    res.json({
      period: {
        type: period,
        start_date: startDate,
        end_date: endDate
      },
      categories: rows
    });
  });
});

// Get monthly budget vs actual
router.get('/budget-analysis', (req, res) => {
  const { year = moment().year() } = req.query;
  
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const query = `
    SELECT 
      strftime('%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as actual_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as actual_expenses
    FROM transactions 
    WHERE date BETWEEN ? AND ?
    GROUP BY strftime('%m', date)
    ORDER BY month
  `;

  db.all(query, [startDate, endDate], (err, rows: any) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch budget analysis' });
      return;
    }

    // Calculate averages for budget recommendations
    const totalIncome = rows.reduce((sum: number, row: any) => sum + row.actual_income, 0);
    const totalExpenses = rows.reduce((sum: number, row: any) => sum + row.actual_expenses, 0);
    const avgIncome = totalIncome / 12;
    const avgExpenses = totalExpenses / 12;

    res.json({
      year: parseInt(year as string),
      monthly_data: rows.map((row: any) => ({
        month: parseInt(row.month),
        actual_income: row.actual_income,
        actual_expenses: row.actual_expenses,
        net_amount: row.actual_income - row.actual_expenses
      })),
      summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        avg_monthly_income: avgIncome,
        avg_monthly_expenses: avgExpenses,
        savings_rate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
      }
    });
  });
});

// Get financial health score
router.get('/health-score', (req, res) => {
  const currentMonth = moment().format('YYYY-MM');
  const lastMonth = moment().subtract(1, 'month').format('YYYY-MM');
  
  // Get current month data
  const currentMonthQuery = `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
    FROM transactions 
    WHERE strftime('%Y-%m', date) = ?
  `;

  // Get last month data
  const lastMonthQuery = `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
    FROM transactions 
    WHERE strftime('%Y-%m', date) = ?
  `;

  // Get goals data
  const goalsQuery = `
    SELECT 
      COUNT(*) as total_goals,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_goals,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_goals,
      SUM(target_amount) as total_target_amount,
      SUM(current_amount) as total_current_amount
    FROM goals
  `;

  db.get(currentMonthQuery, [currentMonth], (err, currentData: any) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch current month data' });
      return;
    }

    db.get(lastMonthQuery, [lastMonth], (err, lastData: any) => {
      if (err) {
        res.status(500).json({ error: 'Failed to fetch last month data' });
        return;
      }

      db.get(goalsQuery, [], (err, goalsData: any) => {
        if (err) {
          res.status(500).json({ error: 'Failed to fetch goals data' });
          return;
        }

        // Calculate health score (0-100)
        let score = 0;
        const factors = [];

        // Income vs Expenses (40 points)
        if (currentData.income > 0) {
          const savingsRate = (currentData.income - currentData.expenses) / currentData.income;
          const incomeScore = Math.min(40, Math.max(0, savingsRate * 100));
          score += incomeScore;
          factors.push({
            name: 'Savings Rate',
            score: incomeScore,
            max_score: 40,
            description: `${(savingsRate * 100).toFixed(1)}% of income saved`
          });
        }

        // Goals Progress (30 points)
        if (goalsData.total_target_amount > 0) {
          const goalsProgress = (goalsData.total_current_amount / goalsData.total_target_amount) * 100;
          const goalsScore = Math.min(30, goalsProgress);
          score += goalsScore;
          factors.push({
            name: 'Goals Progress',
            score: goalsScore,
            max_score: 30,
            description: `${goalsProgress.toFixed(1)}% of goals achieved`
          });
        }

        // Month-over-month improvement (20 points)
        if (lastData.income > 0 && currentData.income > 0) {
          const lastMonthSavingsRate = (lastData.income - lastData.expenses) / lastData.income;
          const currentMonthSavingsRate = (currentData.income - currentData.expenses) / currentData.income;
          const improvement = currentMonthSavingsRate - lastMonthSavingsRate;
          const improvementScore = Math.min(20, Math.max(0, (improvement + 0.1) * 100));
          score += improvementScore;
          factors.push({
            name: 'Month-over-Month Improvement',
            score: improvementScore,
            max_score: 20,
            description: `${(improvement * 100).toFixed(1)}% improvement in savings rate`
          });
        }

        // Goals Completion Rate (10 points)
        if (goalsData.total_goals > 0) {
          const completionRate = (goalsData.completed_goals / goalsData.total_goals) * 100;
          const completionScore = Math.min(10, completionRate);
          score += completionScore;
          factors.push({
            name: 'Goals Completion',
            score: completionScore,
            max_score: 10,
            description: `${completionRate.toFixed(1)}% of goals completed`
          });
        }

        res.json({
          overall_score: Math.round(score),
          grade: getHealthGrade(score),
          factors,
          recommendations: generateRecommendations(score, factors)
        });
      });
    });
  });
});

function getHealthGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function generateRecommendations(score: number, factors: any[]): string[] {
  const recommendations = [];
  
  if (score < 50) {
    recommendations.push('Focus on reducing expenses and increasing income');
    recommendations.push('Set realistic savings goals and track progress');
  } else if (score < 70) {
    recommendations.push('Continue improving your savings rate');
    recommendations.push('Review and optimize your spending categories');
  } else if (score < 90) {
    recommendations.push('Great progress! Consider increasing your savings goals');
    recommendations.push('Look for opportunities to invest your savings');
  } else {
    recommendations.push('Excellent financial health! Consider long-term investment strategies');
    recommendations.push('Help others improve their financial habits');
  }

  return recommendations;
}

export default router;

