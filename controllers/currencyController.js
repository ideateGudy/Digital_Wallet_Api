import axios from "axios";
import User from "../models/User.js";

const convertCurrency = async (req, res) => {
  try {
    const { amount, from, to } = req.body;

    if (!amount || !from || !to) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch conversion rate from API
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );

    if (!response.data.rates[to]) {
      return res.status(400).json({ error: "Invalid currency code" });
    }

    const rate = response.data.rates[to];
    const convertedAmount = amount * rate;

    res.json({ amount, from, to, convertedAmount, rate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
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

export { convertCurrency, switchCurrency };
