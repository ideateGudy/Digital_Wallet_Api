import axios from "axios";

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

export { convertCurrency };
