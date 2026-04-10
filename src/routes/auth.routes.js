import express from "express";
import { userRegisterController,userLoginController } from "../controllers/auth.controller.js";

const router=express.Router();

router.post("/register",userRegisterController);
router.post("/login",userLoginController);

export default router;