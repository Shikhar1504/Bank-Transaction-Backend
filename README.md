# Bank API

A small Express and MongoDB backend for user authentication, account creation, and money transfer transactions.

## Features

- User registration and login with JWT authentication
- Cookie-based auth support, with Bearer token fallback
- Account creation for authenticated users
- Transaction creation between accounts
- System-user endpoint for initial funding transactions

## Tech Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- cookie-parser

## Prerequisites

- Node.js 18 or newer
- MongoDB instance or Atlas connection string

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with the following variables:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
NODE_ENV=development
```

3. Start the server:

```bash
npm run dev
```

For a production start:

```bash
npm start
```

## Available Scripts

- `npm run dev` - start the app with nodemon
- `npm start` - start the app with Node.js
- `npm test` - placeholder script

## Project Structure

```text
src/
  app.js
  config/
    db.js
  controllers/
  middleware/
  models/
  routes/
server.js
```

## API Overview

Base path: `/api`

### Auth

- `POST /api/auth/register` - create a new user
- `POST /api/auth/login` - log in an existing user

### Accounts

- `POST /api/accounts` - create an account for the authenticated user

### Transactions

- `POST /api/transactions` - create a transfer between two accounts
- `POST /api/transactions/system/initial-funds` - create an initial funding transaction for a system user

## Authentication

The app accepts auth tokens from either:

- an `HttpOnly` cookie named `token`
- an `Authorization: Bearer <token>` header

## Notes

- MongoDB connectivity is initialized from `src/config/db.js`.
- The app returns JSON responses and a 404 handler for unknown routes.