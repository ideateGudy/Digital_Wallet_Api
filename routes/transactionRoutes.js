import express from "express";
import {
  deposit,
  withdraw,
  transfer,
  getTransactions,
  verifyTransferOTP,
} from "../controllers/transactionController.js";
import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();
router.get("/", authMiddleware, getTransactions);
router.post("/deposit", authMiddleware, deposit);
router.post("/withdraw", authMiddleware, withdraw);
router.post("/transfer", authMiddleware, transfer);
router.post("/transfer/verify-otp", authMiddleware, verifyTransferOTP);
export default router;
