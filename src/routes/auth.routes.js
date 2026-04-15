import express from "express";
import {
  userRegisterController,
  userLoginController,
  userLogoutController
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", userRegisterController);
router.post("/login", userLoginController);
router.post("/logout", authMiddleware, userLogoutController);

export default router;