import express from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  enable2FA,
  verifyOTP,
  setPin,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.get("/profile/:userId", authMiddleware, getProfile);
router.patch("/profile/:userId", authMiddleware, updateProfile);
router.post("/enable-2fa", authMiddleware, enable2FA);
router.post("/verify-otp", verifyOTP);
router.patch("/set-pin", authMiddleware, setPin);

export default router;
