# AegisLedger Core Banking API

Production-style fintech backend focused on safe money movement, auditability, and concurrency correctness.

## 📌 What This Is

A Node.js, Express, and MongoDB banking backend implementing:

- JWT auth with cookie and Bearer support
- One account per user
- Atomic transfer execution with MongoDB sessions
- Double-entry immutable ledgering
- Idempotent transaction APIs
- Paginated transaction history

## 🌍 Why This Project Matters

Financial systems fail in subtle ways under concurrency: duplicate payments, race-condition overdrafts, and inconsistent ledgers. This project is built to prevent those failures with explicit data integrity controls, making it a practical foundation for real-world fintech workloads.

## 🚀 Core Features

### Authentication & Access

- Register, login, logout
- JWT issuance with HttpOnly cookie
- Bearer token fallback
- Logout token blacklisting with TTL expiry
- System-only funding endpoint guarded by role middleware

### Account & Money Movement

- One-account-per-user enforced via unique index
- Balance updates via atomic inc operations
- Transfer validation: ownership, status, and sufficient funds
- Idempotent retries using idempotency keys

### Ledger & History

- Double-entry postings: one DEBIT + one CREDIT per transfer
- Ledger documents are immutable
- Transaction history endpoint with pagination

## 🧠 Engineering Challenges Solved

### 1. Race Conditions During Concurrent Transfers

Problem: Parallel debits can overdraw accounts.

Solution: Guarded atomic update on sender account with balance check and inc in the same write path.

### 2. Consistency Across Multi-Document Writes

Problem: Partial success can desync balances, transactions, and ledger.

Solution: MongoDB session transactions wrap all critical writes, with rollback on any failure.

### 3. Duplicate Charges on Retries

Problem: Network retries can replay the same transfer.

Solution: Idempotency key uniqueness scoped to sender account plus return-existing behavior.

### 4. Auditability Without Data Drift

Problem: Mutable history breaks forensic trust.

Solution: Ledger entries include balanceAfter snapshots and are protected from mutation/deletion.

## 🏗️ Architecture Overview

### Account: Balance Source of Truth

- account.balance is the real-time spendable amount.
- Transfers modify balances atomically using inc operations.

### Ledger: Immutable Audit Trail

- Every transfer creates balanced DEBIT/CREDIT entries.
- Ledger rows store transaction linkage and post-transaction balance.

### Transaction: Business Event Record

- Captures transfer intent and lifecycle state.
- Works with idempotency to make retries safe.

## 🔐 Security Highlights

- JWT verification on protected routes
- Cookie security flags in production
- Token blacklist to invalidate logged-out sessions
- Ownership checks on account-scoped access
- System-user role check for privileged flows

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB |
| ODM | Mongoose |
| Auth | JSON Web Tokens |
| Security | bcrypt, cookie-parser |

## 📁 Project Structure

```text
.
├─ server.js
├─ package.json
└─ src/
   ├─ app.js
   ├─ config/db.js
   ├─ controllers/
   ├─ middleware/
   ├─ models/
   └─ routes/
```

## 🔌 API Endpoints

Base URL: http://localhost:3000/api

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | /auth/register | Public | Register user and issue auth token |
| POST | /auth/login | Public | Authenticate user and issue auth token |
| POST | /auth/logout | User | Blacklist token and clear cookie |
| POST | /accounts | User | Create account (one per user) |
| GET | /accounts | User | List authenticated user accounts |
| GET | /accounts/balance/:accountId | User | Get balance for owned account |
| POST | /transactions | User | Create idempotent transfer |
| POST | /transactions/system/initial-funds | System User | Transfer funds from system account |
| GET | /transactions/:accountId?page=1&limit=10 | User | Paginated ledger history |

## 📊 Example Request and Response

```http
POST /api/transactions
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "fromAccount": "6806b52f0ec9f5f6a1234568",
  "toAccount": "6806b5480ec9f5f6a1234569",
  "amount": 1500,
  "idempotencyKey": "txn-20260415-001",
  "note": "Wallet top-up"
}
```

```json
{
  "success": true,
  "message": "Transaction completed successfully",
  "transaction": {
    "status": "COMPLETED",
    "amount": 1500,
    "idempotencyKey": "txn-20260415-001"
  }
}
```

## 🧩 Key Concepts

- Idempotency: same key + same sender prevents duplicate money movement.
- Double-entry ledger: every movement is mirrored as DEBIT and CREDIT.
- Atomic transactions: all writes commit together or all roll back.

## 🚀 Run Locally

```bash
npm install
```

Create .env:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/bank
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
```

```bash
npm run dev
```

## 🔧 Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| PORT | No | API port, default 3000 |
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | JWT signing secret |
| NODE_ENV | No | Environment mode |

## 📈 Future Improvements

- Reversal and dispute workflows
- Advanced statement filters and exports
- Rate limiting and abuse protection
- OpenAPI contract + integration test suite
- Observability with metrics, tracing, and structured logs

## 💼 Resume Snapshot

Built a fintech backend that solves core distributed-systems risks in payments: race conditions, duplicate execution, and cross-document inconsistency, using atomic updates, idempotency, and immutable double-entry ledgering.