# Datasets

Generated product files and relevance labels stay in this directory and are not committed. The generator is the source of truth:

```bash
uv run python -m training.generate_sample_data
```

That writes `datasets/synthetic/products.jsonl`, `datasets/synthetic/relevance.jsonl`, and `datasets/synthetic/dataset_manifest.json`. Every generated product row sets `synthetic` to true and `data_origin` to `synthetic_phase_2a`. The catalog is hand-authored. It does not sample customer events, orders, or the production store.

## Contract

`products.jsonl` is one JSON object per line. Fields follow the Convex catalog, with the category denormalized because this phase does not call Convex.

| Field | Convex source | Required | Used in the content model |
| --- | --- | --- | --- |
| `product_id` | `products` document id | Yes | Identity only |
| `name` | `products.name` | Yes | Text |
| `company` | `products.company` (the store's brand) | Yes | Category feature |
| `category_name` | `productCategories.name` | Yes | Text |
| `category_slug` | `productCategories.slug` | Yes | Category feature |
| `description` | `products.description` | No | Text |
| `colors` | `products.colors` | No | Text |
| `highlights` | `products.highlights` | No | Text |
| `seo_keywords` | `products.seoKeywords` | No | Text |
| `price` | `products.price` | Yes | Price band, after discount |
| `discount_percent` | `products.discountPercent` | No | Price band |
| `stock` | `products.stock` | Yes | Not a similarity feature |
| `active` | `products.active` | No | Eligibility. Missing means active, matching `isProductActive` |
| `featured` | `products.featured` | No | Not a similarity feature |
| `stars` | `products.stars` | No | Not a similarity feature |
| `reviews` | `products.reviews` | No | Not a similarity feature |
| `currency` | `products.currency` | No | Not a similarity feature |
| `sku` | `products.sku` | No | Not a similarity feature |

There is no `brand`, tag, specification, or color-family column on `products`. Do not invent those fields. `embedding` and `relevance_group`, if present, are ignored and are not features.

`relevance.jsonl` is evaluation-only. Each line has `product_id` and `relevant_product_ids`. Training does not read it.

A future real export should use this same JSONL shape. The authenticated export is `python -m training.export_catalog`. It writes `datasets/exports/products.jsonl`, which is gitignored. Do not commit a real catalog export.

Behavioral events are a different file. `python -m training.generate_behavioral_data` writes `behavioral_events.jsonl`, `behavioral_products.jsonl`, and `behavioral_manifest.json` in `datasets/synthetic/`. Those rows are synthetic. `python -m training.export_behavioral` stays disabled until `BEHAVIORAL_EXPORT_ENABLED=true`.
