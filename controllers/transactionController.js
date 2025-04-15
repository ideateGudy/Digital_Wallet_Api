import { APIError } from "../utils/errorClass.js";
import { catchAsync } from "../utils/catchAsync.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateOTP } from "../utils/generateOtp.js";
import Otp from "../models/Otp.js";
import { detectFraud } from "../utils/fraudDetection.js";

const transactionSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  accountNumber: z.string().length(10).optional(),
  amount: z.number().positive(),
  receiverId: z.string().optional(),
  pin: z.string().optional(),
});

const deposit = catchAsync(async (req, res) => {
  const validatedData = transactionSchema.parse(req.body);

  // const {amount} = validatedData;
  // if (amount > 20000) return res.status(400).json({ message: "Deposit limit exceeded" });

  const user = await User.findById(req.user.id);
  if (!user) throw new APIError("User not found", 404);

  const currency = user.defaultCurrency;
  const formatedAmount = user.getFormattedAmount(validatedData.amount);

  //---------------------------------------------------------------------------------------//
  const type = "deposit";
  const fraudCheck = await detectFraud(
    req.user.id,
    validatedData.amount,
    currency,
    type
  );

  console.log("fraudCheck", fraudCheck, "validatedData", validatedData);
  if (fraudCheck.isFraud) {
    console.log("⚠️ Fraud Detected:", fraudCheck.message);
    await Transaction.create({
      userId: user._id,
      type: "deposit",
      currency: user.defaultCurrency,
      amount: formatedAmount,
      status: "flagged",
      message: fraudCheck.message,
    });
    return res.status(400).json({
      status: false,
      message: fraudCheck.message,
    });
  } else {
    console.log("✅ Transaction Approved:", fraudCheck.message);
  }
  //---------------------------------------------------------------------------------------//

  user.balance[currency] += validatedData.amount;
  await user.save();

  await Transaction.create({
    userId: user._id,
    type: "deposit",
    currency: user.defaultCurrency,
    amount: formatedAmount,
    status: "success",
    message: `Deposit of ${formatedAmount} was successful`,
  });

  res.json({
    status: true,
    message: `Deposit of ${formatedAmount} was successful`,
    balance: user.getFormattedBalance(),
  });
});

const withdraw = catchAsync(async (req, res) => {
  const validatedData = transactionSchema.parse(req.body);
  // const {amount} = validatedData;
  // if (amount > 20000) return res.status(400).json({ message: "Maximum Withdrawal limit exceeded" });

  const user = await User.findById(req.user.id);
  const currency = user.defaultCurrency;
  const formatedAmount = user.getFormattedAmount(validatedData.amount);

  //---------------------------------------------------------------------------------------//
  const type = "withdraw";
  const fraudCheck = await detectFraud(
    req.user.id,
    validatedData.amount,
    currency,
    type
  );

  console.log("fraudCheck", fraudCheck, "validatedData", validatedData);
  if (fraudCheck.isFraud) {
    console.log("⚠️ Fraud Detected:", fraudCheck.message);
    await Transaction.create({
      userId: user._id,
      type: "withdraw",
      currency: user.defaultCurrency,
      amount: formatedAmount,
      status: "flagged",
      message: fraudCheck.message,
    });
    return res.status(400).json({
      status: false,
      message: fraudCheck.message,
      statusCode: 400,
    });
  } else {
    console.log("✅ Transaction Approved:", fraudCheck.message);
  }
  //---------------------------------------------------------------------------------------//

  if (user.balance[currency] < validatedData.amount) {
    await Transaction.create({
      userId: user._id,
      type: "withdraw",
      currency: user.defaultCurrency,
      amount: formatedAmount,
      status: "failed",
      message: "Insufficient balance",
    });

    return res
      .status(400)
      .json({ status: false, message: "Insufficient balance" });
  }

  user.balance[currency] -= validatedData.amount;
  await user.save();

  await Transaction.create({
    userId: user._id,
    type: "withdraw",
    currency: user.defaultCurrency,
    amount: formatedAmount,
    status: "success",
    message: `Withdrawal of ${formatedAmount} was successful`,
  });

  res.json({
    status: true,
    message: `Withdrawal of ${formatedAmount} was successful`,
    balance: user.getFormattedBalance(),
  });
});

const transfer = catchAsync(async (req, res) => {
  const validatedData = transactionSchema.parse(req.body);
  const sender = await User.findById(req.user.id);
  const receiver = await User.findOne({
    $or: [
      { _id: validatedData.receiverId },
      { username: validatedData.username },
      { accountNumber: validatedData.accountNumber },
    ],
  });
  const pin = validatedData.pin;
  // console.log("validatedData", validatedData);
  const currency = sender.defaultCurrency;
  const formatedAmount = sender.getFormattedAmount(validatedData.amount);
  const type = "transfer";

  const fraudCheck = await detectFraud(
    req.user.id,
    validatedData.amount,
    currency,
    type
  );

  console.log("fraudCheck", fraudCheck, "validatedData", validatedData);
  if (fraudCheck.isFraud) {
    console.log("⚠️ Fraud Detected:", fraudCheck.message);
    await Transaction.create({
      userId: sender._id,
      receiverId: receiver._id,
      type: "transfer",
      currency: sender.defaultCurrency,
      amount: formatedAmount,
      status: "flagged",
      message: fraudCheck.message,
    });
    return res.status(400).json({
      status: false,
      message: fraudCheck.message,
    });
  } else {
    console.log("✅ Transaction Approved:", fraudCheck.message);
  }

  if (!receiver) {
    return res.status(400).json({
      status: false,
      message: "Invalid transfer: No recipient specified",
    });
  }

  if (sender.balance[currency] < validatedData.amount) {
    await Transaction.create({
      userId: sender._id,
      receiverId: receiver._id,
      type: "transfer",
      currency: sender.defaultCurrency,
      amount: formatedAmount,
      status: "failed",
      message: "Insufficient balance",
    });
    return res
      .status(400)
      .json({ status: false, message: "Insufficient balance" });
  }

  if (receiver._id.equals(sender._id)) {
    return res
      .status(400)
      .json({ status: false, message: "Cannot transfer to yourself" });
  }

  if (validatedData.amount <= 0) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid transfer amount" });
  }

  //check if pin is correct
  const isPinCorrect = await bcrypt.compare(pin, sender.pin);
  console.log("isPinCorrect", isPinCorrect);

  if (!isPinCorrect)
    return res.status(400).json({ status: false, message: "Incorrect PIN" });

  //  If 2FA is enabled, generate & send OTP then store the transaction details
  if (sender.twoFAEnabled) {
    generateOTP(sender.email);

    sender.pendingTransaction = {
      amount: validatedData.amount,
      receiverId: receiver._id,
    };
    await sender.save();

    return res.status(200).json({
      status: false,
      message: `OTP sent successfully to ${sender.email}. Enter OTP to proceed.`,
    });
  }

  // Proceed with transfer if 2FA is NOT enabled

  sender.balance[currency] -= validatedData.amount;
  receiver.balance[currency] += validatedData.amount;
  await sender.save();
  await receiver.save();

  await Transaction.create({
    userId: sender._id,
    receiverId: receiver._id,
    type: "transfer",
    currency: sender.defaultCurrency,
    amount: formatedAmount,
    status: "success",
    message: `Transfer of ${formatedAmount} to ${receiver.username} was successful`,
  });

  res.json({
    status: true,
    message: `Transfer of ${formatedAmount} to ${receiver.username} was successful`,
    sender: sender.username,
    recipient: receiver.username,
    balance: sender.getFormattedBalance(),
  });
});

const verifyTransferOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const sender = await User.findOne({ email });

  if (!sender) {
    return res.status(404).json({ status: false, message: "User not found" });
  }

  // Check if OTP exists and is not expired
  const otpRecord = await Otp.findOne({ email, otp });

  if (!otpRecord)
    return res.status(400).json({ status: false, message: "OTP is invalid" });

  if (new Date() > otpRecord.expiresAt) {
    await Otp.deleteMany({ email });
    sender.pendingTransaction = null;
    await sender.save();
    return res.status(400).json({ status: false, message: "OTP expired" });
  }

  if (otpRecord.otp !== otp) {
    return res.status(400).json({ status: false, message: "Incorrect OTP" });
  }

  //  Retrieve the stored transaction details
  const { amount, receiverId } = sender.pendingTransaction || {};

  if (!amount || !receiverId) {
    return res
      .status(400)
      .json({ status: false, message: "No pending transaction found" });
  }

  // Process the transfer
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return res
      .status(400)
      .json({ status: false, message: "Recipient not found" });
  }

  if (sender.balance < amount) {
    return res
      .status(400)
      .json({ status: false, message: "Insufficient balance" });
  }

  const currency = sender.defaultCurrency;
  sender.balance[currency] -= amount;
  receiver.balance[currency] += amount;
  await sender.save();
  await receiver.save();

  const formatedAmount = sender.getFormattedAmount(amount);

  await Transaction.create({
    userId: sender._id,
    receiverId: receiver._id,
    type: "transfer",
    currency: sender.defaultCurrency,
    amount: formatedAmount,
    status: "success",
    message: `Transfer of ${formatedAmount} to ${receiver.username} was successful.`,
  });

  // Remove OTP and pending transaction data
  await Otp.deleteMany({ email });
  sender.pendingTransaction = null;
  await sender.save();

  return res.status(200).json({
    status: true,
    message: `Transfer of ${formatedAmount} to ${receiver.username} was successful.`,
    sender: sender.username,
    recipient: receiver.username,
    balance: sender.getFormattedBalance(),
  });
});

const getTransactions = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const transactions = await Transaction.find({ userId })
    .populate("userId", "name email")
    .populate("receiverId", "name email")
    .sort({ createdAt: -1 });

  res.json({
    status: true,
    totalTransactions: transactions.length,
    transactions,
  });
});

export { deposit, withdraw, transfer, getTransactions, verifyTransferOTP };
