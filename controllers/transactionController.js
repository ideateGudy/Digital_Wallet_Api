import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { z } from "zod";
// import Otp from "../models/Otp.js";
// import otpGenerator from "otp-generator";
// import { sendOTP } from "../utils/mailer.js";
import { generateOTP } from "../utils/generateOtp.js";

const transactionSchema = z.object({
  amount: z.number().positive(),
  receiverId: z.string().optional(),
});

export const deposit = async (req, res) => {
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

export const withdraw = async (req, res) => {
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

export const transfer = async (req, res) => {
  try {
    const validatedData = transactionSchema.parse(req.body);
    // const {amount, receiverId} = validatedData;
    // if (amount > 20000) return res.status(400).json({ message: "Transfer limit exceeded" });
    const sender = await User.findById(req.user.id);
    const receiver = await User.findById(validatedData.receiverId);

    if (!receiver)
      return res
        .status(400)
        .json({ message: "Invalid transfer: No Recepient Specified" });

    if (sender.balance < validatedData.amount)
      return res.status(400).json({ message: "Insufficient balance" });
    if (receiver._id.equals(sender._id))
      return res.status(400).json({ message: "Cannot transfer to yourself" });

    if (validatedData.amount <= 0)
      return res.status(400).json({ message: "Invalid transfer amount" });

    // const resEmail = await generateOTP(email);

    // if (resEmail) {
    //   return res.json({ message: `OTP sent successfully to ${resEmail}` });
    // }

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
    res.status(400).json({ message: error.errors || "Invalid input" });
  }
};

export const getTransactions = async (req, res) => {
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
