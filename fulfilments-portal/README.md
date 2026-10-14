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

The live adapter in `src/liveApi.ts` follows the backend contract at `../PetBackend/mypetfood-api/docs/fulfilments-api-contract.yaml` and uses the existing `apiFetch` bearer-token helper. Keep the backend OpenAPI contract as the source of truth and update the adapter when it changes. The API schema does not expose `allowedActions`, so the portal derives button visibility from the current status and `/v1/me` permissions while the backend validates every transition.

The backend batch still needs to be pushed and deployed before production requests will succeed. The API contract does not define a dedicated label-list or staff-preferences endpoint: the portal derives the label list from queue statuses and saves printer preferences in this browser. If these views need server-backed pagination/preferences, add those endpoints to the contract first. Label creation uses a stable per-fulfilment `Idempotency-Key`; production label purchasing remains unavailable until a real carrier adapter and server-side credentials are configured.
