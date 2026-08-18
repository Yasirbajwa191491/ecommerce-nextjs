import { DEFAULT_CURRENCY, formatCurrencyAmount } from "@/lib/currencies";

const FormatPrice = ({
  price,
  currency = DEFAULT_CURRENCY,
}: {
  price: number;
  currency?: string;
}) => formatCurrencyAmount(price, currency);

export default FormatPrice;
