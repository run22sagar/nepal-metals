# Deployment runbook

This is a functioning application with intentionally empty data until an authorized source and production database are configured. A successful build is not a successful public launch or push-delivery test.

## 1. Supabase

Create a project near Nepal (Mumbai or Singapore). Apply, in order, both SQL files in `supabase/migrations/` using the Supabase SQL editor or `supabase db push` on a linked project. Migrations create no sample prices, users, subscriptions, or headlines.

Create an administrator using Supabase Authentication. Disable public signup if this Auth project is dedicated to the app. Insert that user's UUID into `public.admin_users` through the SQL editor:

```sql
insert into public.admin_users(user_id) values ('REPLACE_WITH_AUTH_USER_UUID');
```

All tables have RLS enabled. Browser roles have no table privileges. The service role is used exclusively by server code. Authenticated users still need an entry in the administrator allowlist to publish.

## 2. Runtime secrets

Use `.env.example` as the variable-name reference. For local development, use ignored `.env.local`. In production, enter values in Vercel's encrypted environment settings, never in source or chat.

Generate the application's random secrets once with `node scripts/generate-secrets.mjs`. This writes an ignored `.env.secrets.local` file. Transfer those entries into the deployment secret store. Next.js does not automatically load that differently named file: import its entries into `.env.local` only for local use. Keep the encryption key stable; rotating it without re-encrypting stored subscriptions makes existing endpoints unreadable. Never regenerate VAPID keys casually for an active subscriber base.

Required for daily notifications:

- `SITE_URL`: exact production HTTPS origin, no trailing slash.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: project API configuration, server only.
- `CRON_SECRET`: at least 32 random characters.
- `SUBSCRIPTION_ENCRYPTION_KEY`: base64-encoded 32 random bytes.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: generated key pair and real operations contact (`mailto:`).
- `ALERT_HOUR_NEPAL=9`: hour in Asia/Kathmandu.

International data additionally requires `METALS_API_KEY` and `METALS_LICENSE_ACTIVE=true`. Enable `METALS_HISTORY_ALLOWED=true` only after confirming the subscription permits the intended retention and display. Turning the license flag off removes international data from the public application. Remove retained data when your agreement requires it.

News is disabled by default. Set `NEWS_ALLOWED_HOSTS` to exact, trusted RSS domains for which headline republication permission has been established. Then enter feed URL, permission basis and terms URL in `/admin`. Redirects are rejected. Do not allow internal services or untrusted domains.

## 3. GitHub and Vercel

Create a dedicated private GitHub repository and push this checkout. Import it into Vercel as a Next.js project. Use Node 22 or later. The build command is `npm run build`; do not use static export. Configure the production environment before the final deployment.

`vercel.json` schedules `/api/cron` every 15 minutes. Vercel sends `Authorization: Bearer CRON_SECRET` when the project secret is configured. This frequency requires a compatible paid Vercel plan. Hobby's daily-only cron limit is insufficient for a 9 AM start with repeated checks after late Nepal publications. An external authenticated scheduler is another option; it must use the same secret and execute reliably.

The international adapter has a 30-minute default cache, approximately 1,488 requests in a 31-day month before retries. Daily notifications wait until today's rates exist for every selected metal. Database leases prevent overlapping jobs; unique delivery records prevent duplicate daily sends. Ambiguous transport failures are not retried automatically, so some notifications can be missed rather than duplicated. Review `unknown` or abandoned `sending` rows operationally.

Run `npm run preflight` in an environment with the deployment configuration. It reports missing names without printing secrets. Do not treat preflight as proof that accounts, licenses or delivery work.

## 4. Publish real data

Sign in at `/admin`. Verify a FENEGOSIDA publication and permission to reproduce it. Enter each metal's NPR-per-tola value, original Nepal publication date/time, source URL, and verification evidence. No automated FENEGOSIDA scraper is enabled. The database commits the record and correction audit together. Identical submissions are no-ops.

Confirm the values, previous-publication changes, source links and timestamps in the server-rendered page and history table. Verify a real international API response and exchange-rate direction after enabling the provider. Do not seed example prices to make an empty page look live.

## 5. Verify the launch

1. Run `npm ci`, `npm test`, and `npm run build`.
2. Run the app, then `npm run test:http` (`TEST_SITE_URL` may point to the public origin).
3. Check `/api/health` returns 200 and confirm a successful scheduled run in Vercel and the administration logs.
4. Check mobile layout, keyboard navigation, English/Nepali switching and source-failure states.
5. Subscribe your own consenting test device, select its ID in `/admin`, and send a clearly labelled test. Verify `received_at` and visually confirm the notification. Provider `accepted` alone is insufficient. Repeat unsubscribe and preference-change checks.
6. Check Android and desktop separately. For iOS/iPadOS 16.4+, install through Safari's Share → Add to Home Screen, open the installed app, then enable notifications. Device tests have not yet been completed in this workspace.
7. Set the final `SITE_URL`, redeploy, and inspect canonical/hreflang links, robots.txt, sitemap.xml and Open Graph image. Use Google Search Console domain verification, submit `/sitemap.xml`, and inspect the main price pages. No ranking guarantee is made.

Optional cookieless analytics are off until `NEXT_PUBLIC_ANALYTICS_DOMAIN` is set. `GOOGLE_SITE_VERIFICATION` supports a Search Console HTML verification token.

## Costs and operational limits

Provider list prices checked November 19, 2026: Vercel Pro starts at $20/month; Supabase Pro starts at $25/month; Metals.Dev Copper is $1.79/month for 2,000 requests or Silver $9.99/month for 10,000. A modest production baseline is approximately $46.79–$54.99/month, excluding taxes, domain registration, source licensing, analytics and usage overages. Confirm prices before purchasing. No paid plan has been purchased by this project.

Sources: [Vercel pricing](https://vercel.com/pricing), [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Supabase pricing](https://supabase.com/pricing), [Metals.Dev pricing](https://metals.dev/pricing), [Metals.Dev terms](https://metals.dev/policy/terms), [Apple Web Push requirements](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Back up production data and test restore before relying on the service. Ingestion/delivery logs are pruned after 90 days; correction audits are retained. Significant-movement alerts are not implemented; the UI offers daily alerts only. Newsletter/email/SMS, trading and e-commerce are outside scope.
