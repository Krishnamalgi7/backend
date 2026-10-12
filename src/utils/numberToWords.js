const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];

const teens = [
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const twoDigitWords = (number) => {
  if (number < 10) {
    return ones[number];
  }

  if (number < 20) {
    return teens[number - 10];
  }

  const tensDigit = Math.floor(number / 10);
  const onesDigit = number % 10;

  return `${tens[tensDigit]}${onesDigit ? ` ${ones[onesDigit]}` : ""}`;
};

const numberToIndianWords = (number) => {
  if (number === 0) {
    return "Zero";
  }

  if (number < 100) {
    return twoDigitWords(number);
  }

  if (number < 1000) {
    const hundreds = Math.floor(number / 100);
    const remainder = number % 100;

    return `${ones[hundreds]} Hundred${
      remainder ? ` ${numberToIndianWords(remainder)}` : ""
    }`;
  }

  if (number < 100000) {
    const thousands = Math.floor(number / 1000);
    const remainder = number % 1000;

    return `${numberToIndianWords(thousands)} Thousand${
      remainder ? ` ${numberToIndianWords(remainder)}` : ""
    }`;
  }

  if (number < 10000000) {
    const lakhs = Math.floor(number / 100000);
    const remainder = number % 100000;

    return `${numberToIndianWords(lakhs)} Lakh${
      remainder ? ` ${numberToIndianWords(remainder)}` : ""
    }`;
  }

  const crores = Math.floor(number / 10000000);
  const remainder = number % 10000000;

  return `${numberToIndianWords(crores)} Crore${
    remainder ? ` ${numberToIndianWords(remainder)}` : ""
  }`;
};

const numberToWords = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error("Invalid amount");
  }

  const rupees = Math.floor(numericAmount);
  const paise = Math.round((numericAmount - rupees) * 100);

  let result = `${numberToIndianWords(rupees)} Rupees`;

  if (paise > 0) {
    result += ` and ${numberToIndianWords(paise)} Paise`;
  }

  return `${result} Only`;
};

module.exports = numberToWords;