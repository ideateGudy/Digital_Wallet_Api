import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "transfer"],
      required: true,
    },
    amount: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "flagged"],
      default: "pending",
      required: true,
    },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", TransactionSchema);
