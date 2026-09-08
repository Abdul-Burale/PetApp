# Happy Paws Backend Integration Plan

## Recommended architecture

Keep the current React/Vite application as the storefront. Use Supabase for Postgres, customer authentication, and product-image storage. Use Supabase Edge Functions as the trusted backend boundary for payment, order, and shipping operations.

| Area | Launch choice | Responsibility |
| --- | --- | --- |
| Storefront | React, TypeScript, Vite | Catalogue browsing, local basket, checkout redirect and customer views |
| Data and auth | Supabase | Postgres, Auth, Storage and Row Level Security |
| Server logic | Supabase Edge Functions | Server-side price validation, provider API calls and webhooks |
| Payments | Stripe Checkout (hosted) | GBP payment collection and payment status |
| Fulfilment | Royal Mail Click & Drop | Shipment creation, postage labels and tracking references |

Use one carrier at launch. Royal Mail Click & Drop is a suitable first choice for a small UK retailer fulfilling its own orders. Model shipments with carrier and tracking fields so EVRi can be added later without reworking orders.

## Security and trust boundary

The React application may use only Supabase's publishable key. It must never receive Supabase service-role credentials, Stripe secret keys, Stripe webhook secrets, or Royal Mail API keys.

Edge Functions own all sensitive operations:

1. Validate the requested basket against the database catalogue and calculate the authoritative total in integer pence.
2. Create Stripe Checkout Sessions.
3. Verify Stripe webhook signatures and process payment events idempotently.
4. Create Royal Mail shipments after a successful payment and store the returned labels and tracking details.
5. Perform staff-only operations such as fulfilment updates and refunds.

Do not mark an order paid from a client-side success page. A verified Stripe webhook is the source of truth. Store Stripe event IDs and make webhook processing idempotent so retries cannot create duplicate orders, charges, or labels.

Enable Row Level Security on every exposed Supabase table. Anonymous visitors may read active catalogue data only. Authenticated customers may read only their own profile, addresses, and orders. Staff actions and all provider integrations must run through protected server functions.

## Launch checkout and fulfilment flow

1. A visitor adds products to the client-side basket; guest checkout is allowed.
2. The checkout action calls an Edge Function with product IDs and quantities.
3. The function re-reads active products, prices, VAT treatment, availability, delivery option, and address details from trusted inputs; it then creates a pending order and Stripe Checkout Session.
4. The storefront redirects the visitor to the Stripe-hosted GBP checkout page.
5. Stripe sends a signed `checkout.session.completed` webhook to an Edge Function.
6. The webhook marks the order paid, decrements or reserves stock as appropriate, and queues it for fulfilment. The success page only confirms that processing is underway.
7. Staff fulfil the order. The system creates a Royal Mail Click & Drop shipment, saves its carrier/service/tracking data, and stores any label reference securely.
8. The order moves through `pending_payment`, `paid`, `fulfilment_pending`, `dispatched`, `delivered`, `cancelled`, or `refunded` as appropriate. Send an order confirmation after payment and a dispatch email with tracking once sent.

## Core data model

Use UUID primary keys and monetary values in integer pence.

- **products**: SKU, slug, name, description, pet, category, price_pence, VAT rate/treatment, active status, stock quantity, weight, dimensions and image references.
- **profiles**: one row per optional Supabase Auth user, linked to `auth.users`.
- **addresses**: customer-owned saved delivery/billing addresses; snapshot the selected address into each order so historical records remain accurate.
- **orders**: order number, optional user ID, customer contact/address snapshots, status, currency (`GBP`), item subtotal, delivery, tax, total, Stripe identifiers and timestamps.
- **order_items**: immutable product/SKU/name/price/tax snapshots and quantity for each order.
- **shipments**: order ID, carrier, service, tracking number, label reference, despatch timestamp and shipment status.
- **webhook_events**: payment-provider event ID, provider, received/processed timestamps and processing outcome for idempotency/audit.

## Delivery phases

### 1. Data and catalogue foundation

Create Supabase migrations, RLS policies, product image storage, typed client access, and an environment-variable convention. Move the current mock catalogue to products/SKUs only when the initial data is ready to be maintained there.

### 2. Checkout and orders

Add guest-first checkout details, shipping rules, trusted order creation, Stripe Checkout Session creation, webhook verification, order confirmation, and a customer order-status page.

### 3. Fulfilment

Connect Royal Mail Click & Drop from a protected function. Support label creation, tracking capture, dispatch status, and dispatch emails. Use the Supabase dashboard for staff operations initially.

### 4. Later improvements

Add optional customer account/order history, EVRi or another carrier, a purpose-built staff admin interface, returns management, promotions, advanced stock handling, and analytics.

## Decisions to make before going live

- Confirm VAT registration and product-specific VAT treatment.
- Define delivery services, prices, the free-delivery threshold, remote-area exceptions, and cut-off times.
- Choose a transactional email provider and sender domain.
- Create production Stripe, Supabase, and Royal Mail accounts, configure production environment secrets, and register Stripe webhook endpoints.
- Define returns/refunds, privacy, cookie, and data-retention policies appropriate for a UK retailer.
- Decide whether stock is reserved at checkout creation or reduced only after confirmed payment.

## Production readiness checklist

- [ ] All provider credentials exist only in server-side secrets.
- [ ] RLS policies have allow and deny tests for anonymous customers, authenticated customers, and staff workflows.
- [ ] Stripe webhook signature validation and idempotent retries are tested.
- [ ] Server-side basket validation rejects altered prices, inactive products, and unavailable stock.
- [ ] Orders, payment failures, expired sessions, refunds, and carrier failures are observable and recoverable.
- [ ] Transactional payment and dispatch emails are tested in a non-production environment.
- [ ] Backups, error monitoring, and a basic operational process for failed labels and customer support are in place.
- [ ] Privacy policy, terms, returns policy, and cookie consent are available before collecting customer data.
