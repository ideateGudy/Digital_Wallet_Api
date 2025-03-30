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

  // Store OTP in database
  await Otp.create({ email, otp, expiresAt });

  // Send OTP via email
  await sendOTP(email, otp);

  return email;
};
