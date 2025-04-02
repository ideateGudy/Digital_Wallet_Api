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
    status: { type: String, enum: ["success", "failed"], required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", TransactionSchema);
