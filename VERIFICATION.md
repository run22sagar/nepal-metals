# Verification record

## Completed locally

- Production `next build`: passed, including TypeScript checking.
- `npm test`: 18 tests passed. The PostgreSQL migrations were executed in isolated PGlite, covering deduplication, audited corrections, invalid publications, browser-role access denial, preference deletion, rate limits, job locks, uneven metal schedules and notification queue eligibility.
- Unit/provider/security tests cover conversions, purity, Nepal midnight and US DST boundaries, stale labels, exchange-rate direction, provider response validation, preservation of stored data after a provider failure, encrypted endpoint integrity, push-host restrictions, request origin/body checks and service-worker parsing/receipt behavior.
- `npm run test:http`: 26 route checks passed against the production server. Includes SSR content, canonical and structured metadata, Nepali document language, sitemap, robots, PWA assets, genuine 404 responses, cron authentication and administrator authorization.
- Browser QA: dashboard at 390px and 1280px widths had no body overflow. Main controls had labels. English/Nepali switching updated the document language; country navigation selected the India route. The alert dialog explained consent and iOS installation, and correctly disabled subscription when credentials were absent. No browser console errors were observed in the final inspected view.
- Production dependency audit: zero reported vulnerabilities at check time.

## Production verification — November 20, 2026

- Public site: https://nepal-metals.vercel.app. Vercel production deployment reached READY; the canonical domain is accessible without Vercel login.
- Supabase production project in Mumbai: both application migrations applied. All 16 application tables have RLS enabled. One authorized administrator exists; public Auth signup is disabled.
- All 26 HTTP/SSR checks passed against the public HTTPS domain. `/api/health` returned 200 with `status: ok`.
- Real administrator password sign-in, protected publishing desk, logout, and Secure/HttpOnly/SameSite=Strict session cookie verified. Production verification found and fixed a Supabase client issue: password sign-in replaces that client's service authorization, so the private administrator allowlist must be checked with a fresh server client.
- Production server secrets installed as sensitive Vercel variables. No secret values are committed or included in the source archive.
- Supabase Cron has an active 15-minute job. Its Vault-backed HTTP path returned 200 with a completed notification scan and international data marked unconfigured. A one-time scheduled launch check executed at 07:39 UTC, recorded `succeeded`, received HTTP 200, and removed its own temporary schedule. This verifies actual timed execution, not long-term scheduler reliability or device delivery.
- Public browser checks: the alert dialog is enabled, the English view showed no console errors, and the Nepali page rendered at 390px with correct document language and no horizontal body overflow.
- No synthetic prices, headlines, subscriptions or test users were inserted into production. The sole Auth user is the owner's requested administrator account.
- Source published to https://github.com/run22sagar/nepal-metals with the owner's approval for public visibility. GitHub Actions run 44696308488 passed npm installation, the 18 tests and production build. Generated private credentials were checked against all 84 tracked files before publication; no matches were found.
- Automatic production deployment verified: pushing commit `27c6ce6` triggered Vercel deployment `dpl_FqDceddBy8n2BvagQhEwVeXqAmUg`, which reached READY.
- EIA Today in Energy RSS registered through the authenticated, audited source workflow after reviewing its official reuse policy. Production ingestion succeeded at 07:42 UTC and stored six oil headlines with source and publication date. An invalid source link with a missing article ID was excluded; no broken EIA IDs were stored. The public server-rendered `/news` page contains the expected headline and original link. The linked November 12 article was checked against EIA's original page. Nepal/gold/silver news sources remain unconfigured.

## Not yet verified

- No live Metals.Dev request has run with an account key. Adapter tests use isolated synthetic fixtures only.
- No authorized automated FENEGOSIDA feed has been established. No official Nepal price records have been published.
- No real browser push subscription or external push delivery has been tested. Worker tests use a simulated runtime and are not proof of device delivery.
- Android/iPhone installation and real device delivery, production scheduler reliability, database restore, Lighthouse/Core Web Vitals and Search Console indexing remain launch checks.

## Remaining source setup

Vercel and Supabase CLI authorization now works; account access is no longer the blocker. To enable international prices, the owner must supply a licensed Metals.Dev API key directly in Vercel's environment settings and confirm public-display rights before enabling the license flag. Nepal reference prices need verified publications and reproduction permission through the existing manual admin workflow. EIA oil news is active; other news categories need permitted sources. Device subscription and a requested test notification are still needed to establish real push delivery.

See `DEPLOYMENT.md` for the exact remaining setup and verification sequence.
