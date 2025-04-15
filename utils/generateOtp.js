import { catchAsync } from "./catchAsync.js";
import Otp from "../models/Otp.js";
import otpGenerator from "otp-generator";
import { sendOTP } from "../utils/mailer.js";

export const generateOTP = async (email) => {
  // Generate 6-digit OTP
  const otp = otpGenerator.generate(6, {
    digits: true,
    alphabets: false,
    specialChars: false,
  });

  // Set OTP expiration time (5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  try {
    // Store OTP in database
    await Otp.create({ email, otp, expiresAt });

    // Send OTP via email
    await sendOTP(email, otp);
    // console.log("OTP sent to:generate", emailUser);

    return email;
  } catch (error) {
    console.error("Error saving OTP to database:", error);
    throw new Error("Failed to generate OTP");
  }
};
