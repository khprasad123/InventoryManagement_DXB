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

function convertHundreds(n: number): string {
  if (n === 0) return "";
  let s = "";
  if (n >= 100) {
    s += ones[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    s += tens[Math.floor(n / 10)] + " ";
    n %= 10;
  } else if (n >= 10) {
    s += teens[n - 10] + " ";
    return s.trim();
  }
  if (n > 0) s += ones[n] + " ";
  return s.trim();
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let s = "";
  let n = intPart;
  if (n >= 1000000000) {
    s += convertHundreds(Math.floor(n / 1000000000)) + " Billion ";
    n %= 1000000000;
  }
  if (n >= 1000000) {
    s += convertHundreds(Math.floor(n / 1000000)) + " Million ";
    n %= 1000000;
  }
  if (n >= 1000) {
    s += convertHundreds(Math.floor(n / 1000)) + " Thousand ";
    n %= 1000;
  }
  s += convertHundreds(n);
  s = s.trim();
  if (decPart > 0) {
    s += " and " + decPart + "/100";
  }
  return s;
}
