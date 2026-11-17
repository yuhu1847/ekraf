import type { ReactNode } from "react";

import type { ProductSummary } from "@/lib/server/products";
import { formatPrice, stockTone } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductCardProps = {
	product: ProductSummary;
	featured?: boolean;
	action?: ReactNode;
	footer?: ReactNode;
	className?: string;
};

/**
 * Bento-style product tile. The first tile on a page is rendered with
 * `featured` so it spans two columns (and two rows on large screens).
 */
export default function ProductCard({
	product,
	featured = false,
	action,
	footer,
	className,
}: ProductCardProps) {
	const stock = stockTone(product.stock);

	return (
		<article className={cn("bento-card flex h-full flex-col", featured && "bento-card-lg", className)}>
			<div className="flex items-start justify-between gap-3">
				<span className="bento-pill" data-tone={stock.tone}>
					{stock.label}
				</span>
				{action}
			</div>

			<div className="mt-5">
				<p className="island-kicker mb-2">{featured ? "Featured product" : "Product"}</p>
				<h3
					className={cn(
						"display-title m-0 font-bold text-[var(--sea-ink)]",
						featured ? "text-3xl sm:text-4xl" : "text-2xl",
					)}
				>
					{product.name}
				</h3>
				<p
					className={cn(
						"m-0 mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]",
						featured && "sm:max-w-xl sm:text-base sm:leading-7",
					)}
				>
					{product.description}
				</p>
			</div>

			<div className="mt-auto flex items-end justify-between gap-4 pt-8">
				<div>
					<p className="island-kicker mb-1">Price</p>
					<p
						className={cn(
							"m-0 font-bold text-[var(--sea-ink)]",
							featured ? "text-3xl sm:text-4xl" : "text-xl",
						)}
					>
						{formatPrice(product.price)}
					</p>
				</div>
				<div className="text-right">
					<p className="island-kicker mb-1">Stock</p>
					<p className="m-0 text-lg font-semibold text-[var(--sea-ink)]">{product.stock}</p>
				</div>
			</div>

			{footer && <div className="mt-5 border-t border-[var(--line)] pt-4">{footer}</div>}
		</article>
	);
}
