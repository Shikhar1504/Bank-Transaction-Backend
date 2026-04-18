import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";
import {
  freezeAccount,
  getAllUsers,
  getAllTransactions,
} from "../controllers/admin.controller.js";
import { strictLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

// ✅ apply both middlewares
router.use(strictLimiter, authMiddleware, adminMiddleware);

router.patch("/freeze/:accountId", freezeAccount);
router.get("/users", getAllUsers);
router.get("/transactions", getAllTransactions);

export default router;
