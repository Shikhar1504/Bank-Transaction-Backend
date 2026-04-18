import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
} from "../controllers/account.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createAccountController);

router.get("/", authMiddleware, getUserAccountsController);

router.get("/balance/:accountId", authMiddleware, getAccountBalanceController);

export default router;
