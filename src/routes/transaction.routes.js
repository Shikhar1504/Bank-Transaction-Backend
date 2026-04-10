import { Router } from "express";
import { authMiddleware,authSystemUserMiddleware } from "../middleware/auth.middleware.js";
import { createTransaction,createInitialFundsTransaction } from "../controllers/transaction.controller.js";

const transactionRoutes = Router();

transactionRoutes.post("/",authMiddleware,createTransaction);
transactionRoutes.post("/system/initial-funds",authSystemUserMiddleware ,createInitialFundsTransaction);

export default transactionRoutes;