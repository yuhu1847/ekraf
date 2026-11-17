const priceFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 2,
});

export function formatPrice(value: number) {
	return priceFormatter.format(value);
}

export type StockTone = "ok" | "low" | "out";

export function stockTone(stock: number): { tone: StockTone; label: string } {
	if (stock <= 0) {
		return { tone: "out", label: "Out of stock" };
	}
	if (stock <= 5) {
		return { tone: "low", label: `Low stock · ${stock}` };
	}
	return { tone: "ok", label: `${stock} in stock` };
}
