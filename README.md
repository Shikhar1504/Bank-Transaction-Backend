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

## 🧠 System Design Concepts Used

### Atomic Transactions

- Explanation: Multiple related writes are treated as one all-or-nothing unit.
- In this project: Transfer execution wraps transaction record creation, balance updates, and ledger inserts inside MongoDB session transactions.
- Why it matters: Prevents partial commits where money moves but history or status does not, which is critical for financial correctness.

### Idempotency

- Explanation: Repeating the same request produces the same outcome instead of duplicate side effects.
- In this project: Transfers accept an idempotency key and enforce uniqueness per sender, returning existing results on safe retries.
- Why it matters: Network retries and client timeouts do not cause double charges.

### Double-Entry Ledger System

- Explanation: Every value transfer is recorded as equal and opposite entries.
- In this project: Each completed transfer writes one DEBIT and one CREDIT ledger row linked to the same business transaction.
- Why it matters: Preserves accounting integrity and simplifies reconciliation.

### Source of Truth Pattern

- Explanation: One canonical field is used for real-time operational decisions.
- In this project: Account balance is the spendable source of truth; ledger is the immutable audit layer.
- Why it matters: Reads stay fast and deterministic while auditability remains intact.

### Race Condition Handling

- Explanation: Concurrent requests are controlled so shared state cannot be corrupted.
- In this project: Sender debit uses guarded atomic updates with sufficient-funds checks in the same write path, plus transaction boundaries.
- Why it matters: Prevents overdrafts and inconsistent balances under high concurrency.

### Immutable Data Pattern

- Explanation: Historical records are append-only and cannot be edited after creation.
- In this project: Ledger entries are written once and protected from mutation/deletion to preserve financial history.
- Why it matters: Enables reliable forensics, compliance checks, and dispute investigation.

### Indexing Strategy

- Explanation: Query-critical fields are indexed to keep latency stable as data grows.
- In this project: Unique indexes enforce one-account-per-user and idempotency constraints; lookup-heavy paths use indexed identifiers.
- Why it matters: Protects correctness constraints and avoids performance degradation at scale.

### Pagination for Scalability

- Explanation: Large result sets are retrieved in bounded chunks.
- In this project: Transaction history endpoints expose page and limit controls for account-level reads.
- Why it matters: Prevents heavy scans, reduces payload size, and keeps API response times predictable.

### Authentication & Authorization

- Explanation: Identity verification is separated from permission checks.
- In this project: JWT-based auth protects routes, with ownership checks and role guards for privileged system operations.
- Why it matters: Reduces unauthorized access risk and enforces least privilege.

### Token Blacklisting

- Explanation: Stateless tokens can be explicitly revoked before natural expiry.
- In this project: Logout stores token identifiers in a blacklist with TTL so revoked sessions are denied immediately.
- Why it matters: Closes post-logout replay windows and improves session security.

### Rate Limiting

- Explanation: Request throughput is capped per client to control abuse.
- In this project: Middleware throttles repeated calls on protected endpoints.
- Why it matters: Improves resilience against brute force and traffic spikes while preserving service availability.

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