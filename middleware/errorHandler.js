import jwt from "jsonwebtoken";
import { APIError } from "../utils/errorClass.js";
// import { fromError } from "zod-validation-error";
import { z } from "zod";
export const globalErrorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof APIError) {
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message,
    });
  }

  if (err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      status: false,
      message: "Token Expired. Please log in again.",
    });
  } else if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      status: false,
      message: "Invalid Token. Please log in again.",
    });
  } else if (err instanceof jwt.NotBeforeError) {
    return res.status(401).json({
      status: false,
      message: "Token not active yet.",
    });
  } else if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => el.message);
    return res.status(400).json({
      status: false,
      message: `Validation Error: ${errors.join(". ")}`,
    });
  } else if (err.name === "CastError") {
    return res.status(400).json({
      status: false,
      message: `Invalid ${err.path}: ${err.value}. Please provide a valid value.`,
    });
  } else if (err.code === 11000) {
    return res.status(400).json({
      status: false,
      message: `Duplicate field value entered for ${Object.keys(
        err.keyValue
      )} field`,
    });
  }

  if (err instanceof z.ZodError) {
    // Get the first validation error
    const firstError = err.errors[0];

    return res.status(400).json({
      status: false,
      message: `${firstError.path.join(
        "."
      )} is ${firstError.message.toLowerCase()}`,
    });
  }

  // Handle other errors
  return res.status(err.status || 500).json({
    status: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
