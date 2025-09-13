import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { db } from '../database/init';

const router = express.Router();

// Get all goals
router.get('/', (req, res) => {
  const { status } = req.query;

  let query = 'SELECT * FROM goals';
  const params: any[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch goals' });
      return;
    }

    // Calculate forecast data for each goal
    const goalsWithForecast = rows.map((goal: any) => ({
      ...goal,
      forecast: calculateGoalForecast(goal)
    }));

    res.json(goalsWithForecast);
  });
});

// Get goal by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM goals WHERE id = ?', [id], (err, row: any) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch goal' });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const goalWithForecast = {
      ...row,
      forecast: calculateGoalForecast(row)
    };

    res.json(goalWithForecast);
  });
});

// Create new goal
router.post('/', (req, res) => {
  const {
    name,
    target_amount,
    current_amount = 0,
    target_date,
    monthly_contribution,
    description
  } = req.body;

  if (!name || !target_amount) {
    res.status(400).json({ 
      error: 'Missing required fields: name, target_amount' 
    });
    return;
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  // Calculate monthly contribution if not provided
  let calculatedMonthlyContribution = monthly_contribution;
  if (!monthly_contribution && target_date) {
    calculatedMonthlyContribution = calculateMonthlyContribution(
      target_amount,
      current_amount,
      target_date
    );
  }

  db.run(
    `INSERT INTO goals 
     (id, name, target_amount, current_amount, target_date, monthly_contribution, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, target_amount, current_amount, target_date, calculatedMonthlyContribution, description, now, now],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to create goal' });
        return;
      }

      const newGoal = {
        id,
        name,
        target_amount,
        current_amount,
        target_date,
        monthly_contribution: calculatedMonthlyContribution,
        description,
        status: 'active',
        created_at: now,
        updated_at: now
      };

      res.status(201).json({
        ...newGoal,
        forecast: calculateGoalForecast(newGoal)
      });
    }
  );
});

// Update goal
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    target_amount,
    current_amount,
    target_date,
    monthly_contribution,
    description,
    status
  } = req.body;

  const now = new Date().toISOString();

  // Recalculate monthly contribution if target amount or date changed
  let calculatedMonthlyContribution = monthly_contribution;
  if (target_amount && target_date && !monthly_contribution) {
    calculatedMonthlyContribution = calculateMonthlyContribution(
      target_amount,
      current_amount || 0,
      target_date
    );
  }

  db.run(
    `UPDATE goals 
     SET name = ?, target_amount = ?, current_amount = ?, target_date = ?, 
         monthly_contribution = ?, description = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [name, target_amount, current_amount, target_date, calculatedMonthlyContribution, description, status, now, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to update goal' });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      res.json({ message: 'Goal updated successfully' });
    }
  );
});

// Delete goal
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM goals WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: 'Failed to delete goal' });
      return;
    }

    if (this.changes === 0) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.json({ message: 'Goal deleted successfully' });
  });
});

// Add contribution to goal
router.post('/:id/contribute', (req, res) => {
  const { id } = req.params;
  const { amount, transaction_id } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'Valid contribution amount is required' });
    return;
  }

  // Get current goal amount
  db.get('SELECT current_amount FROM goals WHERE id = ?', [id], (err, goal: any) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch goal' });
      return;
    }

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const newAmount = goal.current_amount + amount;

    // Update goal amount
    db.run(
      'UPDATE goals SET current_amount = ?, updated_at = ? WHERE id = ?',
      [newAmount, new Date().toISOString(), id],
      function(err) {
        if (err) {
          res.status(500).json({ error: 'Failed to update goal' });
          return;
        }

        // Record the contribution if transaction_id is provided
        if (transaction_id) {
          const contributionId = uuidv4();
          db.run(
            'INSERT INTO goal_transactions (id, goal_id, transaction_id, amount) VALUES (?, ?, ?, ?)',
            [contributionId, id, transaction_id, amount],
            (err) => {
              if (err) {
                console.error('Failed to record goal transaction:', err);
              }
            }
          );
        }

        res.json({
          message: 'Contribution added successfully',
          new_amount: newAmount,
          contribution_amount: amount
        });
      }
    );
  });
});

// Get goal progress and forecast
router.get('/:id/forecast', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM goals WHERE id = ?', [id], (err, goal) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch goal' });
      return;
    }

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const forecast = calculateGoalForecast(goal);
    res.json(forecast);
  });
});

// Helper function to calculate monthly contribution needed
function calculateMonthlyContribution(
  targetAmount: number,
  currentAmount: number,
  targetDate: string
): number {
  const now = moment();
  const target = moment(targetDate);
  const monthsRemaining = target.diff(now, 'months', true);
  
  if (monthsRemaining <= 0) {
    return targetAmount - currentAmount; // Return remaining amount if target date has passed
  }
  
  const remainingAmount = targetAmount - currentAmount;
  return Math.max(0, remainingAmount / monthsRemaining);
}

// Helper function to calculate goal forecast
function calculateGoalForecast(goal: any) {
  const now = moment();
  const targetDate = goal.target_date ? moment(goal.target_date) : null;
  const monthlyContribution = goal.monthly_contribution || 0;
  const remainingAmount = goal.target_amount - goal.current_amount;
  
  let forecast: any = {
    progress_percentage: Math.min(100, (goal.current_amount / goal.target_amount) * 100),
    remaining_amount: remainingAmount,
    monthly_contribution: monthlyContribution,
    is_on_track: true,
    projected_completion_date: null,
    months_to_complete: null
  };

  if (targetDate) {
    const monthsRemaining = targetDate.diff(now, 'months', true);
    const requiredMonthlyContribution = monthsRemaining > 0 ? remainingAmount / monthsRemaining : remainingAmount;
    
    forecast.months_to_complete = Math.max(0, monthsRemaining);
    forecast.required_monthly_contribution = Math.max(0, requiredMonthlyContribution);
    forecast.is_on_track = monthlyContribution >= requiredMonthlyContribution;
    
    if (monthlyContribution > 0) {
      const projectedMonths = remainingAmount / monthlyContribution;
      forecast.projected_completion_date = now.clone().add(projectedMonths, 'months').format('YYYY-MM-DD');
    }
  } else if (monthlyContribution > 0) {
    const projectedMonths = remainingAmount / monthlyContribution;
    forecast.months_to_complete = projectedMonths;
    forecast.projected_completion_date = now.clone().add(projectedMonths, 'months').format('YYYY-MM-DD');
  }

  return forecast;
}

export default router;

