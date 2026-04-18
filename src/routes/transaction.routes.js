import { Router } from "express";
import {
  authMiddleware,
  authSystemUserMiddleware,
} from "../middleware/auth.middleware.js";
import {
  createTransaction,
  createInitialFundsTransaction,
  getTransactionHistoryController,
} from "../controllers/transaction.controller.js";
import { strictLimiter } from "../middleware/rateLimit.middleware.js";

const transactionRoutes = Router();

transactionRoutes.post("/", strictLimiter, authMiddleware, createTransaction);
transactionRoutes.post(
  "/system/initial-funds",
  strictLimiter,
  authSystemUserMiddleware,
  createInitialFundsTransaction,
);
transactionRoutes.get(
  "/:accountId",
  authMiddleware,
  getTransactionHistoryController,
);

export default transactionRoutes;
