# Nepal Metals

Next.js App Router application for Nepal's gold and silver reference prices, with English/Nepali pages, audited manual publishing, international spot estimates, history charts, calculators, RSS ingestion, PWA installation and consent-based web push.

**Live:** https://nepal-metals.vercel.app — deployed to Vercel with a migrated Supabase database in Mumbai, protected administrator access, and a 15-minute Supabase Cron job. Production health, administrator login/logout, and 26 public HTTP checks pass. Real price ingestion, news-feed permission and device push delivery are still unverified. Empty states are deliberate; there are no fabricated market records.

## Run locally

```powershell
npm ci
npm run dev
```

Open http://localhost:3000. Without server configuration, public routes render honest unavailable states and admin/alert operations stay disabled.

```powershell
npm test
npm run typecheck
npm run build
npm start
# In another terminal while the app runs:
npm run test:http
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact Supabase migrations, administrator setup, Vercel deployment, secrets, source permissions, scheduler, Search Console and device verification steps.

## Implementation

- Server-rendered price pages, bilingual canonical/hreflang URLs, sitemap, robots, Open Graph and visible FAQs.
- Separate Nepal reference and international indicative data; exact units, timestamp attribution, explicit stale/unavailable states.
- PostgreSQL constraints, RLS, atomic correction audits, provider logs, server-only keys and typed database schema.
- Metals.Dev adapter with validation, bounded retries and caching; previous observations survive source failures. No unauthorized FENEGOSIDA retrieval.
- Recharts history with explicit gaps, date filters and full-history pagination; responsive calculator and country comparisons.
- Encrypted browser subscriptions, VAPID transport, device preferences and unsubscribe, Nepal-time scheduling, delivery deduplication, expired endpoint cleanup and receipt tracking.
- Protected publishing desk, source management, subscription counts and delivery/audit inspection.

The root `AGENTS.md` identifies the installed Next.js documentation to consult before changes. Synthetic values exist only in isolated tests; migrations create no price fixtures.
