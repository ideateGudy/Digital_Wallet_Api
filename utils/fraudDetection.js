import Transaction from "../models/Transaction.js";

export const detectFraud = async (userId, amount, currency, type) => {
  // Get all successfull transactions created by a user in last 10 minutes (must be same currency)

  console.log("Type---------------", type);
  const recentTransactions = await Transaction.find({
    userId,
    currency,
    status: "success",
    type,
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  });

  // console.log("recentTransactions", recentTransactions);

  // Currency-specific thresholds to detect fraud
  const limits = {
    USD: { totalLimit: 5000, singleLimit: 2000, name: "Dollar" },
    NGN: { totalLimit: 3000000, singleLimit: 1000000, name: "Naira" },
    EUR: { totalLimit: 4000, singleLimit: 1500, name: "Euro" },
    GBP: { totalLimit: 3500, singleLimit: 1200, name: "Pound" },
  };

  const currencyLimits = limits[currency] || limits["NGN"];

  const totalAmount = recentTransactions.reduce(
    (sum, tx) => sum + parseFloat(tx.amount.replace(/[^0-9.]/g, "")),
    0
  );
  //get the currency name
  // const currencyName = currencyNameMapping[currency] || "NGN";
  const currencyName = limits[currency].name || "Naira";

  console.log(
    `Total ${currencyName} transactions in the last 10 minutes: ${totalAmount}`
  );
  console.log(`Single ${currencyName} transaction amount: ${amount}`);

  if (totalAmount > currencyLimits.totalLimit) {
    return {
      isFraud: true,
      message: `Total ${currencyName} transactions in the last 10 minutes exceeds ${currencyLimits.totalLimit} ${currencyName}`,
    };
  }

  if (amount > currencyLimits.singleLimit) {
    return {
      isFraud: true,
      message: `Single ${currencyName} transaction exceeds ${currencyLimits.singleLimit}`,
    };
  }

  return { isFraud: false, message: "No fraud detected" };
};
