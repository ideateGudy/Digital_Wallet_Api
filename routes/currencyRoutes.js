import express from "express";
import {
  convertCurrency,
  switchCurrency,
  calculateRate,
} from "../controllers/currencyController.js";

import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/calculate-rate", authMiddleware, calculateRate);
router.post("/switch-currency", authMiddleware, switchCurrency);
router.post("/convert", authMiddleware, convertCurrency);
//TODO: Convert currency in one balance to another currency balance

export default router;
