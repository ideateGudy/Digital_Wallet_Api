import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Index to ensure that only one OTP can be generated for a user at a time
otpSchema.index({ email: 1 });
otpSchema.index({ otp: 1, expiresAt: 1 });

export default mongoose.model("Otp", otpSchema);
