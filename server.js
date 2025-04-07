import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
// import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import passport from "passport";
import authPassportRoute from "./routes/passportRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
// app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/currency", currencyRoutes);
import "./config/passport.js"; // Passport configuration
app.use(passport.initialize());
app.use("/auth", authPassportRoute); // Google Auth routes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
