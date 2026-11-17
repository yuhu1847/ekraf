import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { type Product, db } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/session";

export const productSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
	description: z
		.string()
		.trim()
		.min(1, "Description is required")
		.max(500, "Description is too long"),
	price: z.coerce
		.number({ error: "Price must be a number" })
		.finite("Price must be a number")
		.min(0, "Price cannot be negative"),
	stock: z.coerce
		.number({ error: "Stock must be a number" })
		.int("Stock must be a whole number")
		.min(0, "Stock cannot be negative"),
});

export type ProductInput = z.infer<typeof productSchema>;

/** Fields that are safe to expose on the public landing page. */
export type ProductSummary = Pick<Product, "id" | "name" | "description" | "price" | "stock">;

function sortByNewest(products: Product[]) {
	return [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function toSummary({ id, name, description, price, stock }: Product): ProductSummary {
	return { id, name, description, price, stock };
}

/**
 * Public read-only projection used by the home page bento. No session needed,
 * and only non-sensitive catalog fields are returned.
 */
export const getPublicProducts = createServerFn({ method: "GET" }).handler(
	async (): Promise<ProductSummary[]> => {
		return sortByNewest(db.product).slice(0, 3).map(toSummary);
	},
);

// TanStack Start server functions support GET and POST only. Mutations use
// POST and encode the intended action in the validator/body.
export const getProducts = createServerFn({ method: "GET" }).handler(async () => {
	await requireAuth();
	return sortByNewest(db.product);
});

export const getProduct = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		await requireAuth();
		return db.product.find((product) => product.id === data.id) ?? null;
	});

export const createProduct = createServerFn({ method: "POST" })
	.validator(productSchema)
	.handler(async ({ data }) => {
		await requireAdmin();
		const now = new Date().toISOString();
		const product: Product = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		db.product.push(product);
		return product;
	});

export const updateProduct = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string(),
			...productSchema.shape,
		}),
	)
	.handler(async ({ data }) => {
		await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) {
			const err = new Error("Product not found") as Error & { status?: number };
			err.status = 404;
			throw err;
		}
		const updated: Product = {
			...db.product[index],
			name: data.name,
			description: data.description,
			price: data.price,
			stock: data.stock,
			updatedAt: new Date().toISOString(),
		};
		db.product[index] = updated;
		return updated;
	});

export const deleteProduct = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) {
			const err = new Error("Product not found") as Error & { status?: number };
			err.status = 404;
			throw err;
		}
		db.product.splice(index, 1);
		return { ok: true };
	});
