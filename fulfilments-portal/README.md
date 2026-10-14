# MyPetFoods Fulfilments Portal

The portal is served by the existing storefront at `/admin/fulfilments`. It shares the storefront's React app, router, authentication session, and deployment. Its staff workspace layout is kept in this directory so the operations UI remains modular.

## Access control

The storefront checks the authenticated backend account for role `staff` and permission `fulfilments:access` before mounting the portal. Customers are sent to sign in; signed-in accounts without that permission see Access denied. The existing navigation and profile links use the same permission check. Every backend endpoint that returns order, address, label, or tracking data must independently enforce fulfilments permissions.

Until the backend contract is connected, production fails closed and displays no order data. Local mock data is opt-in only: copy `.env.example` to `fulfilments-portal/.env.local` and set `VITE_FULFILMENTS_USE_MOCKS=true` while running `npm run dev:fulfilments`. A visible development mock banner identifies all sample data. Mock actions are in-memory only and never purchase postage.

## Build and deployment

Build and deploy the existing storefront as usual from the repository root:

```sh
npm ci
npm run build
```

The hosting site must serve the storefront's `index.html` fallback for `/admin/fulfilments` and nested paths such as `/admin/fulfilments/orders/123`, including on direct navigation and refresh. Existing root-domain DNS and HTTPS serve the route; no separate subdomain, DNS record, or hosting site is required. If the host already provides SPA fallback for the storefront, verify it covers this route.

The backend should allow requests from the storefront's existing origin. If API calls use bearer tokens, continue using the existing authenticated session and allow only the required methods and headers. Never use wildcard credentialed CORS, browser-readable cross-subdomain cookies, or query-string tokens. Do not add shipping credentials to Vite environment variables.

## Development environment

- `VITE_FULFILMENTS_USE_MOCKS` (portal): development-only mock switch; active only when Vite is in development and the value is exactly `true`.
- `VITE_API_BASE_URL` (storefront): existing API base URL. The fulfilments API adapter will use this only after the backend contract is agreed.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (storefront): existing public client configuration; keep using the shared storefront session.

## Backend integration still required

The backend must add `permissions: ["fulfilments:access"]` to its authenticated account response for authorised staff, define the fulfilments API and allowed actions in `docs/fulfilments-api-contract.yaml`, and confirm that the current Supabase access token is accepted by those staff endpoints. The complete request to send the backend team is in the handoff below.

No live fulfilment endpoint is assumed by this frontend. Replace the production-unconfigured adapter in `src/api.ts` only from the agreed OpenAPI contract. The frontend must consume server-returned allowed actions and statuses. Label creation, dispatch, and label downloads must remain server-authorised and idempotent.
