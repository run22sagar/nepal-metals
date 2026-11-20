import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const required = [
  "SITE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "SUBSCRIPTION_ENCRYPTION_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
];
const problems = [];
for (const key of required)
  if (!process.env[key]) problems.push(`${key}: missing`);
if (process.env.SITE_URL && !/^https:\/\//.test(process.env.SITE_URL))
  problems.push("SITE_URL: public HTTPS URL required for production");
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32)
  problems.push("CRON_SECRET: at least 32 characters required");
if (
  process.env.SUBSCRIPTION_ENCRYPTION_KEY &&
  Buffer.from(process.env.SUBSCRIPTION_ENCRYPTION_KEY, "base64").length !== 32
)
  problems.push("SUBSCRIPTION_ENCRYPTION_KEY: must decode to 32 bytes");
if (process.env.VAPID_SUBJECT?.includes("example.com"))
  problems.push("VAPID_SUBJECT: replace example contact");
if (process.env.METALS_LICENSE_ACTIVE !== "true" || !process.env.METALS_API_KEY)
  problems.push(
    "International market data: active Metals.Dev license and API key required",
  );
if (problems.length) {
  console.error(
    "Launch requirements (secret values are never printed):\n" +
      problems.map((p) => "- " + p).join("\n"),
  );
  process.exitCode = 1;
} else
  console.log(
    "Environment checks passed. Still verify database migration, source permissions, scheduler execution and real device delivery before launch.",
  );
