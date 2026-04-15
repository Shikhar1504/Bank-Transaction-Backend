import { Router } from "express";
import { authMiddleware,authSystemUserMiddleware } from "../middleware/auth.middleware.js";
import { createTransaction,createInitialFundsTransaction,getTransactionHistoryController} from "../controllers/transaction.controller.js";

const transactionRoutes = Router();

transactionRoutes.post("/",authMiddleware,createTransaction);
transactionRoutes.post("/system/initial-funds",authSystemUserMiddleware ,createInitialFundsTransaction);
transactionRoutes.get("/:accountId", authMiddleware, getTransactionHistoryController);

export default transactionRoutes;