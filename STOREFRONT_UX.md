# Storefront UX milestone

Search and collection filters share `src/lib/catalog.ts`. All query words match across product name, SKU, description, pet and category, with common singular/plural aliases. Search, repeated category filters, availability, offers and sort are committed to the URL; browser history and reload reconstruct them. Matching uses the complete currently loaded catalogue, not the backend's exact-phrase search. Revisit server-side search/pagination if the catalogue becomes large.

Navigation uses the existing catalogue categories, including Accessories for bird cage accessories. Mobile navigation and the basket use native modal dialogs, explicit keyboard focus wrapping, Escape dismissal and focus restoration. Closed overlays have no interactive content mounted.

The homepage opens directly on the full product catalogue, with featured items ordered first and the rest of the catalogue following. It has no promotional hero or pet tiles before the products. Homepage, shop, and pet listings use URL-backed pagination and page sizes of 12, 24, or 48, with a total-result count, visible range, numbered pages and previous/next controls. Page changes reset after filters change, and browser history and reload retain the selection. Story and guide teasers follow the product list; they use published structured content, and empty teasers are omitted. Guide links target their original ordered section IDs.

Product details retain all API gallery images, package weight and description line breaks. Basket quantities are bounded to 1–99, including restored/merged local storage. Removed and unavailable products remain visible and prevent continuing until removed. Availability failures offer a retry.

## Delivery and payment boundary

The optional UK-postcode estimator uses the existing public `POST /v1/delivery-quotes` endpoint with product IDs and quantities. Only a selected, valid server quote produces an estimated total. Postcode/basket changes cancel pending requests and discard quotes and selections; late responses cannot restore them. Free delivery is displayed only for a zero-price quote. Stock errors block the basket action until the basket changes or a successful new availability check; changing only the postcode does not bypass that warning.

The subtotal is based on the loaded catalogue, so the combined amount is explicitly an estimate. Quotes do not reserve stock or collect a payment. Checkout remains a clearly labeled prototype; Stripe, authoritative order creation, delivery selection persistence and final checkout validation remain a separate milestone. The backend must validate every checkout regardless of frontend guards.

No backend/schema changes or new environment variables are required. Configure the existing API and Supabase variables as usual. Live API verification still requires the deployed service/configuration; the automated tests use intercepted API fixtures, not production customer or staff data.

## Verification

Run `npm run build` and `npm test`. The browser suite runs desktop Chromium and mobile Chromium against the production preview, covering the existing content/admin milestone plus search/history, navigation, product galleries, quantity bounds, unavailable baskets, keyboard dialogs, delivery errors/rate limits, stale responses, and widths down to 320px. Screenshots are generated in ignored `test-results/` directories; fixture product images and blocked remote photos are not a live-content visual audit.
