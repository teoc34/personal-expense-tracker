# Personal Expense Tracker

A comprehensive full-stack personal finance management application built with React, Node.js, and SQLite.

## Features

- 📊 **Dashboard**: Visual overview of your financial data
- 💰 **Transaction Management**: Track income and expenses
- 🏷️ **Smart Categorization**: Automatic transaction categorization
- 🎯 **Financial Goals**: Set and track spending/saving goals
- 📁 **File Upload**: Import transactions from CSV/bank statements
- 📱 **Responsive Design**: Modern, mobile-friendly interface

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Modern React hooks and components

### Backend
- Node.js with Express
- TypeScript
- SQLite database
- File upload and parsing capabilities

## Quick Start

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Project Structure

```
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── database/     # Database initialization
│   │   ├── routes/       # API endpoints
│   │   └── services/     # Business logic
│   └── data/             # SQLite database
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Main pages
│   │   └── services/     # API client
└── uploads/              # Uploaded files storage
```

## API Endpoints

- `GET/POST /api/transactions` - Manage transactions
- `GET/POST /api/categories` - Manage categories
- `GET/POST /api/goals` - Manage financial goals
- `GET /api/dashboard` - Dashboard data
- `POST /api/upload` - File upload and parsing

## Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm start
```

### Build for Production
```bash
npm run build
```

## License

MIT License