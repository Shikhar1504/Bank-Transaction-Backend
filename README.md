# AegisLedger Core Banking API

Production-grade banking backend focused on safe money movement, reliability under failure, and operational observability.

## 📌 What This Is

A Node.js, Express, and MongoDB banking backend implementing:

- JWT auth with cookie and Bearer support
- One account per user
- Atomic transfer execution with MongoDB sessions
- Double-entry immutable ledgering
- Request-level idempotency via a dedicated TTL-backed key store, scoped per sender account to prevent duplicate request execution
- Transaction-level retry with bounded attempts and failure tracking
- Event-driven transaction notifications
- Audit logging for both success and failure paths
- Paginated transaction history

## 🌍 Why This Project Matters

Financial systems fail in subtle ways under concurrency: duplicate payments, race-condition overdrafts, and inconsistent ledgers. This project is built to prevent those failures with explicit data integrity controls, making it a practical foundation for real-world fintech workloads.

- Prevents race-condition-based overdrafts using guarded atomic balance updates.

## 🚀 Core Features

### Authentication & Access

- Register, login, logout
- JWT issuance with HttpOnly cookie
- Bearer token fallback
- Logout token blacklisting with TTL expiry
- System-only funding endpoint guarded by role middleware
- RBAC with USER and ADMIN roles
- Admin APIs for account freeze and operational visibility

### Account & Money Movement

- One-account-per-user enforced via unique index
- Balance updates via atomic inc operations
- Account status enforcement: ACTIVE / FROZEN / CLOSED
- Transfer validation: ownership, status, and sufficient funds
- Transaction state machine: INITIATED -> PROCESSING -> COMPLETED or FAILED
- Automatic retry for failed transactions (max 3 attempts)
- Retry telemetry through retryCount and failureReason
- Idempotency (request-level deduplication) and retry (transaction-level recovery) are intentionally decoupled to ensure correct system behavior

### Ledger & History

- Double-entry postings: one DEBIT + one CREDIT per transfer
- Ledger documents are immutable
- Transaction history endpoint with pagination
- Audit log collection records transfer success and failure outcomes

### Event-Driven Processing

- Domain events emitted after transaction outcomes
- transaction.completed and transaction.failed events are handled by decoupled listeners
- Notification flow is isolated from core transfer execution

## 🧠 Engineering Challenges Solved

### 1. Race Conditions During Concurrent Transfers

Problem: Parallel debits can overdraw accounts.

Solution: Guarded atomic update on sender account with balance check and inc in the same write path.

### 2. Consistency Across Multi-Document Writes

Problem: Partial success can desync balances, transactions, and ledger.

Solution: MongoDB session transactions wrap all critical writes, with rollback on any failure.

### 3. Duplicate Charges on Retries

Problem: Network retries can replay the same transfer.

Solution: Request-level idempotency keys are stored in a separate collection with TTL expiry, while transaction-level retries are controlled by state and retry limits.

### 4. Controlled Recovery from Transient Failures

Problem: Failed transfers need safe retry without creating duplicate business operations.

Solution: Failed transactions move through a bounded retry cycle using retryCount and failureReason, with a maximum of 3 attempts.

### 5. Auditability Without Data Drift

Problem: Mutable history breaks forensic trust.

Solution: Ledger entries are immutable and every transfer outcome is written to a dedicated audit log collection.

## 🏗️ Architecture Overview

### Account: Balance Source of Truth

- account.balance is the real-time spendable amount.
- Transfers modify balances atomically using inc operations.

### Ledger: Immutable Audit Trail

- Every transfer creates balanced DEBIT/CREDIT entries.
- Ledger rows store transaction linkage and post-transaction balance.

### Transaction: Business Event Record

- Captures transfer intent and lifecycle state.
- Encodes retry metadata: retryCount and failureReason.
- Uses state transitions to drive retry behavior safely.

### Idempotency Store: Request De-duplication Layer

- Keys are persisted in a dedicated idempotency collection.
- TTL index expires old keys automatically.
- Protects against duplicate client request submission.

### Audit Log: Operational Observability Layer

- Success and failure events are recorded in an independent collection.
- Links user and transaction metadata for traceability.

### Clean Service Boundaries

- Controller -> Service -> Model flow keeps orchestration, business logic, and persistence concerns separated.

## 🔐 Security Highlights

- JWT verification on protected routes
- Cookie security flags in production
- Token blacklist to invalidate logged-out sessions
- Ownership checks on account-scoped access
- System-user role check for privileged flows
- Admin role enforcement for operational endpoints
- Strict rate limiting on sensitive transaction and admin APIs

## ⚙️ Tech Stack

| Layer     | Technology            |
| --------- | --------------------- |
| Runtime   | Node.js               |
| Framework | Express 5             |
| Database  | MongoDB               |
| ODM       | Mongoose              |
| Auth      | JSON Web Tokens       |
| Security  | bcrypt, cookie-parser |

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

| Method | Route                                    | Access      | Purpose                                |
| ------ | ---------------------------------------- | ----------- | -------------------------------------- |
| POST   | /auth/register                           | Public      | Register user and issue auth token     |
| POST   | /auth/login                              | Public      | Authenticate user and issue auth token |
| POST   | /auth/logout                             | User        | Blacklist token and clear cookie       |
| POST   | /accounts                                | User        | Create account (one per user)          |
| GET    | /accounts                                | User        | List authenticated user accounts       |
| GET    | /accounts/balance/:accountId             | User        | Get balance for owned account          |
| POST   | /transactions                            | User        | Create idempotent transfer             |
| POST   | /transactions/system/initial-funds       | System User | Transfer funds from system account     |
| GET    | /transactions/:accountId?page=1&limit=10 | User        | Paginated ledger history               |
| PATCH  | /admin/freeze/:accountId                 | Admin       | Freeze a user account                  |
| GET    | /admin/users                             | Admin       | View all users                         |
| GET    | /admin/transactions                      | Admin       | View all transactions                  |

## 🔄 Transaction Lifecycle

State machine used by transfer processing:

INITIATED → PROCESSING → COMPLETED
INITIATED → PROCESSING → FAILED

Failed transactions are eligible for automatic retry based on transaction state and retryCount, up to 3 total attempts.

## ⚡ Event Flow

1. Service completes or fails a transaction.
2. Domain event is emitted on the event bus:

- transaction.completed
- transaction.failed

3. Notification handlers consume events in a decoupled path.
4. Audit records preserve outcome-level traceability.
5. This decoupling allows side effects to evolve independently without modifying core transaction logic.

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

- Idempotency: request-level duplicate submission protection via dedicated key store.
- Retry: transaction-level recovery flow for FAILED operations with bounded attempts.
- Double-entry ledger: every movement is mirrored as DEBIT and CREDIT.
- Atomic transactions: all writes commit together or all roll back.
- Event-driven processing: domain events decouple core transfer logic from side effects.
- Auditability: explicit success/failure logs improve observability and incident analysis.

## 🧠 System Design Concepts Used

### Atomic Transactions

- Explanation: Multiple related writes are treated as one all-or-nothing unit.
- In this project: Transfer execution wraps transaction record creation, balance updates, and ledger inserts inside MongoDB session transactions.
- Why it matters: Prevents partial commits where money moves but history or status does not, which is critical for financial correctness.

### Idempotency

- Explanation: Repeating the same request produces the same outcome instead of duplicate side effects.
- In this project: Idempotency keys are stored in a dedicated collection with TTL expiration, scoped to request de-duplication.
- Why it matters: Client/network replay does not execute duplicate transfers, and key storage remains bounded over time.

### Retry Mechanism

- Explanation: Failed business operations are retried in a controlled, bounded manner.
- In this project: Failed transactions re-enter PROCESSING based on transaction state with retryCount and failureReason, capped at 3 attempts.
- Retry is limited to recent failed transactions using a time window to prevent unintended reuse of older operations.
- Why it matters: Improves resilience for transient failures without unbounded retries.

### Separation of Concerns (Idempotency vs Retry)

- Explanation: Request de-duplication and business-operation retry solve different failure classes.
- In this project: Idempotency prevents duplicate submissions; retry manages failed transaction execution state.
- Why it matters: Avoids mixing client replay control with internal recovery logic, improving correctness and debuggability.

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
- In this project: JWT-based auth protects routes, with ownership checks and RBAC (USER vs ADMIN) for privileged APIs.
- Why it matters: Reduces unauthorized access risk and enforces least privilege.

### Token Blacklisting

- Explanation: Stateless tokens can be explicitly revoked before natural expiry.
- In this project: Logout stores token identifiers in a blacklist with TTL so revoked sessions are denied immediately.
- Why it matters: Closes post-logout replay windows and improves session security.

### Rate Limiting

- Explanation: Request throughput is capped per client to control abuse.
- In this project: A strict limiter is applied to sensitive transaction and admin routes, with a broader global API limiter for baseline protection.
- Why it matters: Improves resilience against brute force and traffic spikes while preserving service availability.

### Event-Driven Architecture

- Explanation: Business outcomes are emitted as events and processed by independent consumers.
- In this project: transaction.completed and transaction.failed are emitted from transfer services and handled by decoupled notification listeners.
- Why it matters: Side effects remain modular and extensible without coupling to transaction execution.

### Observability (Audit Logs)

- Explanation: Operational events are recorded for traceability and incident analysis.
- In this project: Transfer success and failure are persisted in a dedicated audit log collection with user and transaction linkage.
- Why it matters: Accelerates debugging, supports compliance workflows, and improves production visibility.

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

| Variable    | Required | Purpose                   |
| ----------- | -------- | ------------------------- |
| PORT        | No       | API port, default 3000    |
| MONGODB_URI | Yes      | MongoDB connection string |
| JWT_SECRET  | Yes      | JWT signing secret        |
| NODE_ENV    | No       | Environment mode          |

## 📈 Future Improvements

- Reversal and dispute workflows
- Advanced statement filters and exports
- OpenAPI contract + integration test suite
- Observability with metrics, tracing, and structured logs
- Outbox and durable event delivery for cross-service integrations

## 💼 Resume Snapshot

Built a production-grade banking backend handling concurrency, fault tolerance, and financial data integrity using atomic transactions, state-driven retries, TTL-based idempotency, immutable double-entry ledgering, and event-driven architecture with audit logging and RBAC controls.
