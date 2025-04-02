import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateOTP } from "../utils/generateOtp.js";
import Otp from "../models/Otp.js";

const transactionSchema = z.object({
  amount: z.number().positive(),
  receiverId: z.string().optional(),
  pin: z.string().optional(),
});

const deposit = async (req, res) => {
  try {
    const validatedData = transactionSchema.parse(req.body);
    // const {amount} = validatedData;
    // if (amount > 20000) return res.status(400).json({ message: "Deposit limit exceeded" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.balance += validatedData.amount;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: "deposit",
      amount: validatedData.amount,
      status: "success",
    });

    res.json({ message: "Deposit successful", balance: user.balance });
  } catch (error) {
    res.status(400).json({ message: error.errors || "Invalid input" });
  }
};

const withdraw = async (req, res) => {
  try {
    const validatedData = transactionSchema.parse(req.body);
    // const {amount} = validatedData;
    // if (amount > 20000) return res.status(400).json({ message: "Withdrawal limit exceeded" });

    const user = await User.findById(req.user.id);

    if (user.balance < validatedData.amount)
      return res.status(400).json({ message: "Insufficient balance" });

    user.balance -= validatedData.amount;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: "withdrawal",
      amount: validatedData.amount,
      status: "success",
    });

    res.json({ message: "Withdrawal successful", balance: user.balance });
  } catch (error) {
    res.status(400).json({ message: error.errors || "Invalid input" });
  }
};

const transfer = async (req, res) => {
  try {
    const validatedData = transactionSchema.parse(req.body);
    const sender = await User.findById(req.user.id);
    const receiver = await User.findById(validatedData.receiverId);
    const pin = validatedData.pin;
    console.log("validatedData", validatedData);

    if (!receiver) {
      return res
        .status(400)
        .json({ message: "Invalid transfer: No recipient specified" });
    }

    if (sender.balance < validatedData.amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    if (receiver._id.equals(sender._id)) {
      return res.status(400).json({ message: "Cannot transfer to yourself" });
    }

    if (validatedData.amount <= 0) {
      return res.status(400).json({ message: "Invalid transfer amount" });
    }

    //check if pin is correct
    const isPinCorrect = await bcrypt.compare(pin, sender.pin);
    console.log("isPinCorrect", isPinCorrect);

    if (!isPinCorrect)
      return res.status(400).json({ message: "Incorrect PIN" });

    //  If 2FA is enabled, generate & send OTP then store the transaction details
    if (sender.twoFAEnabled) {
      await generateOTP(sender.email);

      sender.pendingTransaction = {
        amount: validatedData.amount,
        receiverId: validatedData.receiverId,
      };
      await sender.save();

      return res.status(200).json({
        message: `OTP sent successfully to ${sender.email}. Enter OTP to proceed.`,
      });
    }

    // Proceed with transfer if 2FA is NOT enabled
    sender.balance -= validatedData.amount;
    receiver.balance += validatedData.amount;
    await sender.save();
    await receiver.save();

    await Transaction.create({
      userId: sender._id,
      receiverId: receiver._id,
      type: "transfer",
      amount: validatedData.amount,
      status: "success",
    });

    res.json({
      status: "success",
      message: `Transfer to ${receiver.name} was successful`,
      transferAmount: validatedData.amount,
      sender: sender.name,
      recipient: receiver.name,
      balance: sender.balance,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Invalid input" });
  }
};

const verifyTransferOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const sender = await User.findOne({ email });

    if (!sender) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if OTP exists and is not expired
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) return res.status(400).json({ message: "OTP is invalid" });

    if (new Date() > otpRecord.expiresAt)
      return res.status(400).json({ message: "OTP expired" });

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    //  Retrieve the stored transaction details
    const { amount, receiverId } = sender.pendingTransaction || {};

    if (!amount || !receiverId) {
      return res.status(400).json({ message: "No pending transaction found" });
    }

    // Process the transfer
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(400).json({ message: "Recipient not found" });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sender.balance -= amount;
    receiver.balance += amount;
    await sender.save();
    await receiver.save();

    await Transaction.create({
      userId: sender._id,
      receiverId: receiver._id,
      type: "transfer",
      amount,
      status: "success",
    });

    // Cleanup: Remove OTP and pending transaction data
    await Otp.deleteMany({ email });
    sender.pendingTransaction = null;
    await sender.save();

    return res.status(200).json({
      status: "success",
      message: `Transfer of ${amount} to ${receiver.name} was successful.`,
      balance: sender.balance,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Invalid request" });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("userId", "name email")
      .populate("receiverId", "name email")
      .sort({ createdAt: -1 });

    res.json({
      status: true,
      totalTransactions: transactions.length,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions" });
  }
};

export { deposit, withdraw, transfer, getTransactions, verifyTransferOTP };
