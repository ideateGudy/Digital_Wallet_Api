import express from "express";
import { convertCurrency } from "../controllers/currencyController.js";

import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/convert", authMiddleware, convertCurrency);

export default router;
