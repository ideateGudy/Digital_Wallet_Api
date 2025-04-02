import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { formatBalance } from "../utils/formatBalance.js";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: 'true, "Please enter a name' },
    email: {
      type: String,
      required: [true, "Please enter an email"],
      unique: true,
    },
    password: { type: String, required: true },
    // balance: { type: Number, default: 0 },
    defaultCurrency: {
      type: String,
      enum: ["NGN", "USD", "EUR", "GBP"],
      default: "NGN", // Default currency for transactions
    },
    balance: {
      NGN: { type: Number, default: 0 },
      USD: { type: Number, default: 0 },
      EUR: { type: Number, default: 0 },
      GBP: { type: Number, default: 0 },
    },
    twoFAEnabled: { type: Boolean, default: false },
    pin: {
      type: String,
      default: "1234",
    },
    pendingTransaction: {
      amount: { type: Number, default: null },
      receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true }
);

//hash password and pin before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") && !this.isModified("pin")) return next();

  try {
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isModified("pin") || this.pin === "1234") {
      const salt = await bcrypt.genSalt(10);
      this.pin = await bcrypt.hash(this.pin.toString(), salt);
    }

    next();
  } catch (error) {
    next(error);
  }
});

//format

UserSchema.methods.getFormattedAmount = function (amount) {
  const currencySymbols = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const defaultCurrency = this.defaultCurrency || "NGN"; // Fallback to NGN if not set
  const symbol = currencySymbols[defaultCurrency] || "₦";

  return `${symbol}${amount.toFixed(2)}`;
};

UserSchema.methods.getFormattedBalance = function () {
  const currencySymbols = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  // Ensure default currency exists, fallback to NGN
  const defaultCurrency = this.defaultCurrency || "NGN";

  // Get the correct symbol
  const symbol = currencySymbols[defaultCurrency] || "₦";

  // Get balance for the default currency
  const balance = this.balance[defaultCurrency] || 0;

  return `${symbol}${balance}`;
};

export default mongoose.model("User", UserSchema);
