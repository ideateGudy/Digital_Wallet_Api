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

// const detectFraud = async (userId, amount) => {
//   const recentTransactions = await Transaction.find({
//     userId,
//     createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }, // This gets all transaction made in the last 10 minutes
//   });

//   console.log("recentTransactions", recentTransactions);
//   const totalAmount = recentTransactions.reduce(
//     (sum, tx) => sum + parseFloat(tx.amount.replace(/[^0-9.]/g, "")), // Remove non-numeric characters
//     0
//   );
//   console.log("totalAmount", totalAmount, "amount", amount, "userId", userId);

//   if (totalAmount > 5000)
//     return {
//       isFraud: true,
//       message: `Total transactions in the last 10 minutes exceed 5000`,
//     };

//   if (amount > 2000)
//     return { isFraud: true, message: "Single transaction exceeds 2000" };

//   return { isFraud: false, message: "No fraud detected" };
// };
const detectFraud = async (userId, amount, currency) => {
  // Get all transactions by user in last 10 minutes with the same currency
  console.log("currency", currency);

  //FIXME: This is not working as expected
  const recentTransactions = await Transaction.find({
    userId,
    currency,
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  });

  console.log("recentTransactions", recentTransactions);

  // Currency-specific thresholds
  const limits = {
    USD: { totalLimit: 5000, singleLimit: 2000 },
    NGN: { totalLimit: 3000000, singleLimit: 1000000 },
    EUR: { totalLimit: 4000, singleLimit: 1500 },
    GBP: { totalLimit: 3500, singleLimit: 1200 },
  };

  const currencyLimits = limits[currency] || limits["USD"];

  const totalAmount = recentTransactions.reduce(
    (sum, tx) => sum + parseFloat(tx.amount.replace(/[^0-9.]/g, "")),
    0
  );

  console.log(
    `Total ${currency} transactions in the last 10 minutes: ${totalAmount}`
  );
  console.log(`Single ${currency} transaction amount: ${amount}`);

  if (totalAmount > currencyLimits.totalLimit) {
    return {
      isFraud: true,
      message: `Total ${currency} transactions in the last 10 minutes exceed ${currencyLimits.totalLimit}`,
    };
  }

  if (amount > currencyLimits.singleLimit) {
    return {
      isFraud: true,
      message: `Single ${currency} transaction exceeds ${currencyLimits.singleLimit}`,
    };
  }

  return { isFraud: false, message: "No fraud detected" };
};

const deposit = async (req, res) => {
  try {
    const validatedData = transactionSchema.parse(req.body);

    // const {amount} = validatedData;
    // if (amount > 20000) return res.status(400).json({ message: "Deposit limit exceeded" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const currency = user.defaultCurrency;
    user.balance[currency] += validatedData.amount;
    await user.save();

    const formatedAmount = user.getFormattedAmount(validatedData.amount);

    await Transaction.create({
      userId: user._id,
      type: "deposit",
      currency: user.defaultCurrency,
      amount: formatedAmount,
      status: "success",
      message: `Deposit of ${formatedAmount} was successful`,
    });

    res.json({
      message: `Deposit of ${formatedAmount} was successful`,
      balance: user.getFormattedBalance(),
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.errors || "Invalid input" });
  }
};

const withdraw = async (req, res) => {
  try {
    const validatedData = transactionSchema.parse(req.body);
    // const {amount} = validatedData;
    // if (amount > 20000) return res.status(400).json({ message: "Maximum Withdrawal limit exceeded" });

    const user = await User.findById(req.user.id);
    const currency = user.defaultCurrency;

    if (user.balance[currency] < validatedData.amount) {
      await Transaction.create({
        userId: user._id,
        type: "withdrawal",
        currency: user.defaultCurrency,
        amount: formatedAmount,
        status: "failed",
        message: "Insufficient balance",
      });

      return res.status(400).json({ message: "Insufficient balance" });
    }

    user.balance[currency] -= validatedData.amount;
    await user.save();

    const formatedAmount = user.getFormattedAmount(validatedData.amount);

    await Transaction.create({
      userId: user._id,
      type: "withdrawal",
      currency: user.defaultCurrency,
      amount: formatedAmount,
      status: "success",
      message: `Withdrawal of ${formatedAmount} was successful`,
    });

    res.json({
      message: `Withdrawal of ${formatedAmount} was successful`,
      balance: user.getFormattedBalance(),
    });
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
    // console.log("validatedData", validatedData);
    const currency = sender.defaultCurrency;
    const formatedAmount = sender.getFormattedAmount(validatedData.amount);

    const fraudCheck = await detectFraud(
      req.user.id,
      validatedData.amount,
      sender.defaultCurrency
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
        status: "flagged",
        message: fraudCheck.message,
        statusCode: 400,
      });
    } else {
      console.log("✅ Transaction Approved:", fraudCheck.message);
    }

    if (!receiver) {
      return res
        .status(400)
        .json({ message: "Invalid transfer: No recipient specified" });
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
      message: `Transfer of ${formatedAmount} to ${receiver.name} was successful`,
    });

    res.json({
      status: "success",
      message: `Transfer of ${formatedAmount} to ${receiver.name} was successful`,
      sender: sender.name,
      recipient: receiver.name,
      balance: sender.getFormattedBalance(),
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

    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteMany({ email });
      sender.pendingTransaction = null;
      await sender.save();
      return res.status(400).json({ message: "OTP expired" });
    }

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
      message: `Transfer of ${formatedAmount} to ${receiver.name} was successful.`,
    });

    // Remove OTP and pending transaction data
    await Otp.deleteMany({ email });
    sender.pendingTransaction = null;
    await sender.save();

    return res.status(200).json({
      status: "success",
      message: `Transfer of ${formatedAmount} to ${receiver.name} was successful.`,
      sender: sender.name,
      recipient: receiver.name,
      balance: sender.getFormattedBalance(),
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Invalid request" });
  }
};

const getTransactions = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions" });
  }
};

export { deposit, withdraw, transfer, getTransactions, verifyTransferOTP };
