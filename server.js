import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { globalErrorHandler } from "./middleware/errorHandler.js";
// import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import passport from "passport";
import authPassportRoute from "./routes/passportRoutes.js";

connectDB();

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
// app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/currency", currencyRoutes);
import "./utils/passport-oauth20.js";
app.use(passport.initialize());
app.use("/auth", authPassportRoute);

const PORT = process.env.PORT || 3000;

app.use(globalErrorHandler);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
