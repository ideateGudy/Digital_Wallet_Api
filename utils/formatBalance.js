const currencySymbols = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
};
// const currencyNames = {
//   NGN: "Naira",
//   USD: "Dollar",
//   EUR: "Euro",
//   GBP: "Pound",
// };

export const formatBalance = (balance, currency) => {
  const symbol = currencySymbols[currency] || ""; // Default to empty if currency is unknown
  return `${symbol}${balance}`;
};
