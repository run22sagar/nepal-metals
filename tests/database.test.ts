import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL migration: deduplication, corrections, audit, RLS, consent, job locks", async () => {
  const pg = new PGlite();
  await pg.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;",
  );
  const migration = readFileSync(
    "supabase/migrations/202611200001_initial.sql",
    "utf8",
  ).replace("create extension if not exists pgcrypto;", "");
  await pg.exec(migration);
  await pg.exec(
    readFileSync("supabase/migrations/202611200002_delivery_queue.sql", "utf8"),
  );
  const actor = "00000000-0000-4000-8000-000000000001";
  await pg.query("insert into admin_users(user_id) values($1)", [actor]);
  const publish = (amount: number, reason = "Test source manually verified") =>
    pg.query("select publish_nepal_rate($1,$2,$3,$4,$5,$6,$7)", [
      actor,
      "gold",
      amount,
      "2020-01-01",
      "2020-01-01T10:00:00+05:45",
      "https://www.fenegosida.org/",
      reason,
    ]);
  await publish(100);
  await publish(100);
  let count = await pg.query<{ n: number }>(
    "select count(*)::int n from price_observations",
  );
  assert.equal(count.rows[0].n, 1);
  count = await pg.query<{ n: number }>(
    "select count(*)::int n from admin_audit",
  );
  assert.equal(count.rows[0].n, 1);
  await publish(110, "Correction with verified evidence");
  const row = await pg.query<{ amount: string; revision: number }>(
    "select amount,revision from price_observations",
  );
  assert.equal(Number(row.rows[0].amount), 110);
  assert.equal(row.rows[0].revision, 2);
  const audit = await pg.query<{
    before_data: { amount: number };
    after_data: { amount: number };
  }>("select before_data,after_data from admin_audit order by id desc limit 1");
  assert.equal(Number(audit.rows[0].before_data.amount), 100);
  assert.equal(Number(audit.rows[0].after_data.amount), 110);
  await assert.rejects(publish(-1));
  await assert.rejects(publish(111, "short"));
  await assert.rejects(
    pg.query("select publish_nepal_rate($1,$2,$3,$4,$5,$6,$7)", [
      actor,
      "silver",
      100,
      "2099-01-01",
      "2099-01-01T10:00:00+05:45",
      "https://www.fenegosida.org/",
      "Future rejected",
    ]),
  );
  await pg.exec("set role anon");
  await assert.rejects(pg.query("select * from push_subscriptions"));
  await assert.rejects(publish(100));
  await pg.exec("reset role");
  const sub = await pg.query<{ id: string }>(
    "select save_subscription('device','endpoint','cipher',array['gold','silver'],true) id",
  );
  const id = sub.rows[0].id;
  await pg.query(
    "insert into notification_deliveries(subscription_id,publication_date) values($1,'2020-01-01')",
    [id],
  );
  await assert.rejects(
    pg.query(
      "insert into notification_deliveries(subscription_id,publication_date) values($1,'2020-01-01')",
      [id],
    ),
  );
  await pg.query("delete from push_subscriptions where id=$1", [id]);
  count = await pg.query<{ n: number }>(
    "select count(*)::int n from notification_preferences",
  );
  assert.equal(count.rows[0].n, 0);
  const job = await pg.query<{ ok: boolean }>(
    "select acquire_job($1,$2,60) ok",
    ["test", actor],
  );
  assert.equal(job.rows[0].ok, true);
  const second = await pg.query<{ ok: boolean }>(
    "select acquire_job($1,$2,60) ok",
    ["test", actor],
  );
  assert.equal(second.rows[0].ok, false);
  const limit = await pg.query<{ ok: boolean }>(
    "select consume_limit('test',1,60) ok",
  );
  assert.equal(limit.rows[0].ok, true);
  assert.equal(
    (await pg.query<{ ok: boolean }>("select consume_limit('test',1,60) ok"))
      .rows[0].ok,
    false,
  );
  // Uneven publication schedules must still return two observations per metal.
  for (const [metal, date] of [
    ["silver", "2019-12-01"],
    ["silver", "2019-12-02"],
    ["gold", "2020-01-02"],
    ["gold", "2020-01-03"],
    ["gold", "2020-01-04"],
  ])
    await pg.query("select publish_nepal_rate($1,$2,100,$3,$4,$5,$6)", [
      actor,
      metal,
      date,
      date + "T10:00:00+05:45",
      "https://www.fenegosida.org/",
      "Verified test source",
    ]);
  const latest = await pg.query<{ metal: string }>(
    "select * from latest_nepal_rates()",
  );
  assert.equal(latest.rows.filter((p) => p.metal === "silver").length, 2);
  assert.equal(latest.rows.filter((p) => p.metal === "gold").length, 2);
  const goldSub = await pg.query<{ id: string }>(
    "select save_subscription('gold-device','gold-endpoint','cipher',array['gold'],true) id",
  );
  await pg.query(
    "select save_subscription('both-device','both-endpoint','cipher',array['gold','silver'],true)",
  );
  let pending = await pg.query<{ id: string }>(
    "select * from pending_daily_subscriptions('2020-01-04',100)",
  );
  assert.deepEqual(
    pending.rows.map((r) => r.id),
    [goldSub.rows[0].id],
  );
  await pg.query(
    "insert into notification_deliveries(subscription_id,publication_date) values($1,'2020-01-04')",
    [goldSub.rows[0].id],
  );
  pending = await pg.query<{ id: string }>(
    "select * from pending_daily_subscriptions('2020-01-04',100)",
  );
  assert.equal(pending.rows.length, 0);
  await pg.close();
});
