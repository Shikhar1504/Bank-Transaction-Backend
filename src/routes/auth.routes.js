import express from "express";
import {
  userRegisterController,
  userLoginController,
  userLogoutController,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { strictLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/register", strictLimiter, userRegisterController);
router.post("/login", strictLimiter, userLoginController);
router.post("/logout", authMiddleware, userLogoutController);

export default router;
