import { currencyRates } from "../utils/currencyRates.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { z } from "zod";

const calculateRateSchema = z.object({
  amount: z.number(),
  from: z.string(),
  to: z.string(),
});

const calculateRate = async (req, res) => {
  try {
    //use zod schema to validate the request body
    const validated = calculateRateSchema.parse(req.body);
    const amount = validated.amount;
    const from = validated.from;
    const to = validated.to;

    if (!amount || !from || !to) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch and calculate the conversion rate from API
    const conversion = await currencyRates(amount, from, to);
    res.status(200).json({
      message: `Conversion Successful`,
      amount: conversion.amount,
      from: conversion.from,
      to: conversion.to,
      convertedAmount: conversion.convertedAmount,
      rate: conversion.rate,
    });
  } catch (error) {
    // console.error(error);
    res.status(400).json({ error: error.message });
  }
};

const currencyType = ["NGN", "USD", "EUR", "GBP"];

const switchCurrency = async (req, res) => {
  try {
    const { newCurrency } = req.body;
    const userId = req.user.id;

    // Ensure the new currency input is valid
    if (!currencyType.includes(newCurrency)) {
      return res.status(400).json({ error: "Invalid currency" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the default currency
    user.defaultCurrency = newCurrency;
    await user.save();

    res.json({
      message: `Currency switched to ${newCurrency}`,
      defaultCurrency: user.defaultCurrency,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const convertCurrency = async (req, res) => {
  const validated = calculateRateSchema.parse(req.body);
  const amount = validated.amount;
  const from = validated.from;
  const to = validated.to;
  const userId = req.user.id;
  // Ensure the new currency input is valid
  if (!currencyType.includes(from) || !currencyType.includes(to)) {
    return res.status(400).json({ error: "Invalid currency" });
  }
  if (!amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has sufficient balance for conversion
    const fromBalance = user.balance[from];

    if (fromBalance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
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
      return res.status(400).json({ error: "Conversion failed" });
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
      message: `Conversion Successful`,
      amount,
      from,
      to,
      rate: conversion.rate,
      newBalanceFrom: user.balance[from],
      newBalanceTo: user.balance[to],
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};

export { convertCurrency, switchCurrency, calculateRate };
