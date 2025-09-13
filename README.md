# Personal Expense Tracker

A comprehensive personal budget management application that helps you track expenses, manage categories, set savings goals, and forecast your financial future.

## Features

- 📊 **Bank Extract Upload**: Upload bank statements in various formats (CSV, PDF, Excel)
- 🏷️ **Smart Categorization**: Automatic categorization of income and expenses
- 🎯 **Savings Goals**: Set financial goals with monthly savings forecasts
- 📈 **Analytics Dashboard**: Visual charts and spending trends
- 💰 **Budget Management**: Track income vs expenses with category breakdowns
- 🔄 **Real-time Updates**: Live updates as you add transactions

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (development) / PostgreSQL (production)
- **File Processing**: Multer + various parsers for different formats

## Getting Started

1. Install dependencies:
```bash
npm run install-all
```

2. Start development servers:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to view the application

## Project Structure

```
personal-expense-tracker/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
├── shared/           # Shared types and utilities
└── docs/             # Documentation
```

## License

MIT License - see LICENSE file for details

