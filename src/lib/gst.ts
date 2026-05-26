export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

export type LineItem = {
  name: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  gst_rate: number;
};

export function computeLineAmount(item: LineItem) {
  return +(item.quantity * item.rate).toFixed(2);
}

export function computeInvoiceTotals(items: LineItem[], discount: number, sameState: boolean) {
  const subtotal = items.reduce((s, it) => s + computeLineAmount(it), 0);
  const disc = Math.min(discount || 0, subtotal);
  const taxable = subtotal - disc;
  let cgst = 0, sgst = 0, igst = 0;
  for (const it of items) {
    const amt = computeLineAmount(it);
    const share = subtotal > 0 ? amt / subtotal : 0;
    const lineTaxable = taxable * share;
    const tax = (lineTaxable * it.gst_rate) / 100;
    if (sameState) { cgst += tax / 2; sgst += tax / 2; } else { igst += tax; }
  }
  const round = (n: number) => +n.toFixed(2);
  const total = round(taxable + cgst + sgst + igst);
  return {
    subtotal: round(subtotal),
    discount: round(disc),
    taxable: round(taxable),
    cgst: round(cgst),
    sgst: round(sgst),
    igst: round(igst),
    total,
  };
}

// Indian rupee amount in words
const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
  "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

function twoDigit(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n/10)] + (n%10 ? " " + ones[n%10] : "");
}
function threeDigit(n: number): string {
  const h = Math.floor(n/100), r = n%100;
  return (h ? ones[h] + " Hundred" + (r ? " " : "") : "") + (r ? twoDigit(r) : "");
}
export function amountInWords(num: number): string {
  if (!isFinite(num)) return "";
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  let words = "";
  if (crore) words += twoDigit(crore) + " Crore ";
  if (lakh) words += twoDigit(lakh) + " Lakh ";
  if (thousand) words += twoDigit(thousand) + " Thousand ";
  if (rest) words += threeDigit(rest);
  words = words.trim() + " Rupees";
  if (paise) words += " and " + twoDigit(paise) + " Paise";
  return words + " Only";
}

export function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);
}
