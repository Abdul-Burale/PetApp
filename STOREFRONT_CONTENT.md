# Storefront content

## Editing and publishing

From **Account → Admin tools → Pages**, select a Help or About page.
Each editor describes the public layout and provides topic-specific writing guidance
beside its fields. Existing topic cards can be expanded, removed or reordered.
Recommended headings are optional: they are added only when staff clicks a button,
and contain no prewritten business facts, promises or legal copy.

| Page | Public layout / editable mapping |
| --- | --- |
| Contact Us | Shared contact panel beside enquiry form; page sections become supporting notes |
| Delivery | Ordered topic cards and topic jump links |
| Returns | Numbered vertical topics, with numbered points for return instructions |
| FAQs | Ordered, searchable native accordions from `faqs`; optional supporting page sections |
| Our Story | First section is the editorial lead; subsequent sections are story/values cards |
| Pet Care Guides | Each section is one complete guide, with searchable index and full guide text |
| Privacy Policy | Ordered clauses, linked contents and last-updated date |
| Terms | Ordered clauses, linked contents and last-updated date |

Title and intro control each page's heading and introduction. Section headings,
bodies and bullet arrays remain plain text. Content is never rendered as HTML or
decoded entities. Arrays are neither sorted nor matched to hardcoded content slots.

Phone labels/numbers, postal address, email, hours and reply expectations are edited
under **Storefront → Contact details**, independently of the Contact Us page.
These values populate `/contact` and the footer (reply expectations appear on
`/contact`). The footer editor controls link labels, grouping, order and visibility.

Saves publish immediately. Each resource uses its own last-read version. A conflict
preserves the local draft, displays the newest saved content, and requires an
explicit choice and a separate save. Failed PUTs never display success. Successful
PUTs are followed by a public GET; if that check fails or returns different page
content/version, the editor reports a saved-but-unconfirmed result, not a failed
save that should be retried.

Contact submissions are acknowledged as received, not emailed. This backend
milestone has no inbox or notifications. Production therefore still needs a
separate operational workflow to handle stored enquiries.

## Why public pages previously said “Page not found”

The eight literal routes mounted `ContentPageView` without a slug, while the
component tried to read `useParams().slug`. None of those routes declared `:slug`,
so the API query was disabled and the frontend displayed “Page not found.”
Routes now pass an explicit, typed system slug from the central page catalogue.

The account Pages card already targeted `/admin/content?section=pages`; that route
is retained. Staff access now waits for the backend account lookup before making
a role decision, avoiding an incorrect redirect on direct navigation/refresh.
Sign-in return URLs preserve the editor query parameters.

Real API 404s remain visible and cannot open a blank, saveable editor. An unsupported
editor `page` query is also reported instead of silently opening another page.
`public/_redirects` retains the SPA hosting rewrite for direct navigation; verify
that the deployed host honours it (local production-preview refresh tests cannot
prove a remote host's configuration).

## Backend compatibility and deployment checks

The adjacent backend repository's `ContentDtos`, `StorefrontContentService`,
updated `docs/storefront-content-api.md` and Flyway V6 already define ordered
`phones: [{label, number}]` and the structured `address` object. No schema expansion
is needed for these layouts. The frontend accepts legacy single-phone public reads
for compatibility, but explicitly disables expanded contact editing if the server
does not return the new shape. It also checks that contact PUT responses retain it.

There is no configured live API URL or live staff session in this workspace. Backend
source inspection confirms the contract, not that the production deployment has
that contract. No live staff content or enquiries were modified during testing.

If the deployed API still fails, use this deployment-verification prompt:

> Verify the My Pet Food backend deployed at the storefront's actual
> VITE_API_BASE_URL; do not introduce a new CMS or alter catalogue/checkout rules.
> Confirm Flyway V5 and V6 completed, all eight system pages exist, public and active
> staff GET /v1/(staff/)content/pages/{slug} return the matching slug/version, and
> PUT with the last-read version persists content returned by the public GET.
> Confirm GET /v1/content/site and PUT /v1/staff/content/contact return/accept
> ordered phones (up to five labeled UK numbers) and the address object with
> line1, line2, townCity, county, postcode, country; empty strings are allowed.
> Check 409 conflict protection, 401/403 staff authorization, and request IDs.
> Confirm CORS exposes X-Request-Id and Retry-After and public contact messages
> return 202 without claiming email notification. Diagnose any 404 with the
> failing route, deployment/version, migration state and request ID. Add regression
> tests for any actual defect; do not duplicate APIs that are already implemented.

## Verification

`npm test` builds a production bundle with non-secret test configuration and runs
Playwright on desktop and mobile Chromium. Every external API write is intercepted;
the tests cover routing/refresh, all editor saves and public read-back, arrays and
FAQ order, escaping, conflict decisions, access control, validation/error states,
contact rendering and rate limiting. Screenshot artifacts are in `test-results/`
and ignored by git. First-time setups may need `npx playwright install chromium`.

`npm run build` performs the normal TypeScript and production-build check. The
existing `npm run lint` script references ESLint, but ESLint is not installed in
this repository; the test and build commands are the configured checks here.

The configured test build reports Vite's bundle-size warning. Dependency installation
also reported existing security advisories; `npm audit --omit=dev` identifies a high
advisory in `source-map-js`. This milestone does not apply broad dependency upgrades.
