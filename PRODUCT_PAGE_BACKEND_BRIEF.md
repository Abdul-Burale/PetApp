# Backend prompt: product sizes and written reviews

Extend the My Pet Food API to support the new product detail page. Preserve the existing catalogue, basket product IDs, delivery quotes and Stripe integration contracts. The frontend now displays all product images, package weight and dimensions, rating totals, shared shop contact details, and similar products. Do not treat shipping/package weight as a customer-facing size or net-content weight.

## Size choices

Add these optional fields to `GET /v1/products/{slug}` alongside its existing fields:

```json
{
  "sizeLabel": "2 kg",
  "sizeOptions": [
    { "productId": "existing-product-uuid", "slug": "chicken-food-2kg", "label": "2 kg", "available": true },
    { "productId": "another-product-uuid", "slug": "chicken-food-5kg", "label": "5 kg", "available": false }
  ]
}
```

Use existing independently priced/stocked product records for each sellable size, grouped by an optional product group identifier. Every option must point to a real, publicly readable product, with that product's own SKU, images, price, dimensions and stock. Include the current product in the options and preserve a staff-defined order. Include active products that are out of stock as unavailable; exclude inactive/deleted products. Reject groups spanning unrelated products. Ungrouped products return null/omitted `sizeLabel` and an empty/omitted `sizeOptions` array.

Expose group membership, size label and ordering through the existing authorized staff product reads/writes, with validation and backwards-compatible defaults. Return a frontend handoff documenting the exact staff fields before the frontend size editor is implemented. The public frontend already accepts the optional shape above: choosing a size navigates to its product page, and the basket/checkout uses that real product ID. Do not accept a display label as a substitute for a purchasable ID. Stripe order creation must obtain prices and availability from the server.

Test public size selection data, inactive and unavailable options, group ordering, invalid group links, customer authorization failures on edits, and delivery/checkout using the chosen product ID.

## Written reviews

The current API exposes `ratingAverage` and `reviewCount` only. The frontend displays that summary and an honest empty state; it does not have review text or a review submission form.

For written reviews, add a public paginated `GET /v1/products/{slug}/reviews?limit=5&cursor=...` returning:

```json
{
  "data": [
    { "id": "review-uuid", "displayName": "Approved public name", "rating": 5, "title": "Review title", "body": "Plain-text review", "createdAt": "2026-10-07T12:00:00Z", "verifiedPurchase": true }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

Only publish approved reviews. Derive `verifiedPurchase` from server order records, never client input. Return no private account/order data. Keep aggregate ratings/counts consistent with published reviews, validate rating range and text lengths, use stable pagination, and return the existing request-ID/error envelope. Do not seed fictional reviews. Supply a separate review collection/moderation plan before adding submission endpoints. This endpoint will need a frontend integration once delivered.

## Existing capabilities and checkout

The image gallery already consumes the existing ordered `images` array. The staff frontend currently edits the primary image; managing multiple images in that editor is separate frontend work. Seller information uses the existing `/v1/content/site` contact block for this single-store business.

“Buy now” adds the selected product and quantity to the existing basket and navigates to `/checkout`. No Stripe API is assumed or called yet. Return the actual checkout/session, authentication, delivery selection and redirect contract when the Stripe work is ready so that checkout can be connected to it.
