import axios from "axios";

export const currencyRates = async (amount, from, to) => {
  try {
    // Fetch conversion rate from API
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );

    if (!response.data.rates[to]) {
      throw new Error("Invalid currency code");
    }

    const rate = response.data.rates[to];
    const convertedAmount = amount * rate;

    return { amount, from, to, convertedAmount, rate };
  } catch (error) {
    console.error("Error:----", error);
    throw new Error("Cannot convert currency: " + error.message);
  }
};
