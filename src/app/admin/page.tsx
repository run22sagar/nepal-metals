import Link from "next/link";
import { admin, alertsReady } from "@/lib/security";
import { db, databaseReady } from "@/lib/db";
import {
  LoginForm,
  Logout,
  PublishForm,
  NewsSourceForm,
  TestPushForm,
} from "@/components/admin-forms";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  let authorized = false;
  try {
    await admin();
    authorized = true;
  } catch {}
  if (!authorized)
    return (
      <main id="main" className="admin-shell">
        <Link href="/">Nepal Metals</Link>
        <h1>Administration</h1>
        {!databaseReady() ? (
          <div className="notice">
            Database connection required. Configure the server environment and
            apply the migration before signing in.
          </div>
        ) : (
          <LoginForm />
        )}
      </main>
    );
  const client = db();
  const [logs, deliveries, sources, audit, subscriptions] = await Promise.all([
    client
      .from("ingestion_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
    client
      .from("notification_deliveries")
      .select(
        "id,subscription_id,publication_date,kind,status,provider_status,received_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(30),
    client
      .from("news_sources")
      .select("*")
      .order("created_at", { ascending: false }),
    client
      .from("admin_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("push_subscriptions")
      .select("id,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return (
    <main id="main" className="admin-shell">
      <Link href="/">Public dashboard</Link>
      <h1>Publishing desk</h1>
      <Logout />
      <div className="admin-stats">
        <div>
          Subscriptions<strong>{subscriptions.count ?? "Unavailable"}</strong>
        </div>
        <div>
          International feed
          <strong>
            {process.env.METALS_API_KEY &&
            process.env.METALS_LICENSE_ACTIVE === "true"
              ? "Configured"
              : "Inactive"}
          </strong>
        </div>
        <div>
          Push credentials
          <strong>{alertsReady() ? "Configured" : "Missing"}</strong>
        </div>
      </div>
      <p className="notice">
        Nepal publishing: manual verification. Push credential status does not
        establish successful delivery. Review received_at and confirm on a real
        device.
      </p>
      <PublishForm />
      <section className="panel">
        <h2>Recent ingestion and failures</h2>
        <pre>
          {JSON.stringify(
            logs.error ? { error: "Could not load logs" } : logs.data,
            null,
            2,
          )}
        </pre>
      </section>
      <NewsSourceForm />
      <section className="panel">
        <h2>News source status</h2>
        <pre>{JSON.stringify(sources.data, null, 2)}</pre>
      </section>
      <TestPushForm />
      <section className="panel">
        <h2>Recent subscriptions (no endpoint secrets)</h2>
        <pre>{JSON.stringify(subscriptions.data, null, 2)}</pre>
        <h2>Delivery results</h2>
        <pre>{JSON.stringify(deliveries.data, null, 2)}</pre>
      </section>
      <section className="panel">
        <h2>Administrative audit history</h2>
        <pre>{JSON.stringify(audit.data, null, 2)}</pre>
      </section>
    </main>
  );
}
