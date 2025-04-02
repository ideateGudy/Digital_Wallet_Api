import express from "express";
import {
  convertCurrency,
  switchCurrency,
} from "../controllers/currencyController.js";

import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/convert", authMiddleware, convertCurrency);
router.post("/switch-currency", authMiddleware, switchCurrency);

export default router;
