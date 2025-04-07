import express from "express";

import {
  register,
  login,
  getProfile,
  updateProfile,
  toogle2FA,
  verifyOTP,
  setPin,
  updatePassword,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.get("/profile/:userId", authMiddleware, getProfile);
router.patch("/profile/:userId", authMiddleware, updateProfile);
router.post("/toogle-2fa", authMiddleware, toogle2FA);
router.post("/verify-otp", verifyOTP);
router.patch("/set-pin", authMiddleware, setPin);
router.patch("/update-password", authMiddleware, updatePassword);

export default router;
