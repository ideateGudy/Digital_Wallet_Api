import { catchAsync } from "../utils/catchAsync.js";
import { currencyRates } from "../utils/currencyRates.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { z } from "zod";

const calculateRateSchema = z.object({
  amount: z.number(),
  from: z.string(),
  to: z.string(),
});

const calculateRate = catchAsync(async (req, res) => {
  //use zod schema to validate the request body
  const validated = calculateRateSchema.parse(req.body);
  // const amount = validated.amount;
  // const from = validated.from;
  // const to = validated.to;
  const { amount, from, to } = validated;

  if (!amount || !from || !to) {
    return res
      .status(400)
      .json({ status: false, message: "Missing required fields" });
  }

  // Fetch and calculate the conversion rate from API
  const conversion = await currencyRates(amount, from, to);
  res.status(200).json({
    status: true,
    message: `Conversion Successful`,
    amount: conversion.amount,
    from: conversion.from,
    to: conversion.to,
    convertedAmount: conversion.convertedAmount,
    rate: conversion.rate,
  });
});

const currencyType = ["NGN", "USD", "EUR", "GBP"];

const switchCurrency = catchAsync(async (req, res) => {
  const { newCurrency } = req.body;
  const userId = req.user.id;

  // Ensure the new currency input is valid
  if (!currencyType.includes(newCurrency)) {
    return res.status(400).json({ status: false, message: "Invalid currency" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ status: false, message: "User not found" });
  }

  // Update the default currency
  user.defaultCurrency = newCurrency;
  await user.save();

  res.json({
    status: true,
    message: `Currency switched to ${newCurrency}`,
    defaultCurrency: user.defaultCurrency,
  });
});

const convertCurrency = catchAsync(async (req, res) => {
  const validated = calculateRateSchema.parse(req.body);
  // const amount = validated.amount;
  // const from = validated.from;
  // const to = validated.to;
  const userId = req.user.id;

  const { amount, from, to } = validated;
  // Ensure the new currency input is valid
  if (!currencyType.includes(from) || !currencyType.includes(to)) {
    return res.status(400).json({ status: false, message: "Invalid currency" });
  }
  if (!amount) {
    return res
      .status(400)
      .json({ status: false, message: "Missing required fields" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ status: false, message: "User not found" });
  }

  // Check if the user has sufficient balance for conversion
  const fromBalance = user.balance[from];

  if (fromBalance < amount) {
    return res
      .status(400)
      .json({ status: false, message: "Insufficient balance" });
  }
  // Perform the conversion
  const conversion = await currencyRates(amount, from, to);
  if (!conversion) {
    await Transaction.create({
      userId,
      amount,
      currency: from,
      type: "conversion",
      message: `Failed to convert ${amount} ${from} to ${to}`,
      status: "failed",
    });
    return res
      .status(400)
      .json({ status: false, message: "Conversion failed" });
  }

  // Update the user's balance
  user.balance[from] -= amount;
  user.balance[to] += conversion.convertedAmount;
  await user.save();

  // Create a transaction record
  await Transaction.create({
    userId,
    amount,
    currency: from,
    type: "conversion",
    message: `Converted ${amount} ${from} to ${conversion.convertedAmount.toFixed(
      2
    )} ${to}`,
    status: "success",
  });
  res.json({
    status: true,
    message: `Conversion Successful`,
    amount,
    from,
    to,
    rate: conversion.rate,
    newBalanceFrom: user.balance[from],
    newBalanceTo: user.balance[to],
  });
});

export { convertCurrency, switchCurrency, calculateRate };
