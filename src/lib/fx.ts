const rateCache = new Map<string, number>();

async function fetchExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  const key = `${from}->${to}`;
  const cached = rateCache.get(key);
  if (cached) return cached;

  const url = `https://api.exchangerate.host/convert?from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(to)}`;

  const res = await fetch(url);
  if (!res.ok) {
    // Fallback: no conversion if API fails
    return 1;
  }
  const data = (await res.json()) as { result?: number };
  const rate = typeof data.result === "number" && data.result > 0 ? data.result : 1;
  rateCache.set(key, rate);
  return rate;
}

export async function convertAmountToCurrency(
  amount: number,
  from: string,
  to: string
): Promise<number> {
  if (!amount || from === to) return amount;
  const rate = await fetchExchangeRate(from, to);
  return amount * rate;
}

