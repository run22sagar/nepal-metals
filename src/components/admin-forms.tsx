"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
async function submit(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
export function LoginForm() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await submit("/api/admin/login", Object.fromEntries(form));
      router.refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel login-panel" onSubmit={login}>
      <h2>Administrator sign in</h2>
      <p>Access is restricted to approved Supabase users.</p>
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
        />
      </label>
      <Button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      <p role="status" className="form-message">
        {message}
      </p>
    </form>
  );
}
export function Logout() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await fetch("/api/admin/login", { method: "DELETE" });
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
export function PublishForm() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await submit("/api/admin/prices", {
        metal: form.get("metal"),
        amount: Number(form.get("amount")),
        publication_date: form.get("date"),
        published_at: String(form.get("published")) + ":00+05:45",
        source_url: form.get("source"),
        reason: form.get("reason"),
        verified: form.get("verified") === "on",
      });
      setMessage(
        "Verified publication saved with an audit entry. An identical resubmission is a no-op.",
      );
      router.refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={publish} className="panel">
      <h2>Publish or correct a Nepal reference rate</h2>
      <p>
        Verify the original publication and your right to reproduce it. Enter
        its actual timestamp, not the current time. Publishing an existing
        metal/date corrects that record and preserves its previous value in the
        audit trail.
      </p>
      <div className="form-grid">
        <label>
          Metal
          <select name="metal">
            <option value="gold">Fine gold · 24K</option>
            <option value="silver">Silver reference</option>
          </select>
        </label>
        <label>
          NPR per tola
          <input
            name="amount"
            type="number"
            min="0.01"
            max="99999999"
            step="0.01"
            required
          />
        </label>
        <label>
          Publication date (Nepal)
          <input name="date" type="date" required />
        </label>
        <label>
          Source publication timestamp (Nepal)
          <input name="published" type="datetime-local" required />
        </label>
        <label className="span-2">
          Original source URL
          <input
            name="source"
            type="url"
            defaultValue="https://www.fenegosida.org/"
            required
          />
        </label>
        <label className="span-2">
          Verification evidence / correction reason
          <textarea
            name="reason"
            rows={3}
            minLength={10}
            maxLength={2000}
            required
          />
        </label>
        <label className="checkbox-label span-2">
          <input name="verified" type="checkbox" required />I checked this
          source publication and have permission to publish this rate.
        </label>
      </div>
      <Button disabled={busy}>
        {busy ? "Saving…" : "Publish verified rate"}
      </Button>
      <p role="status" className="form-message">
        {message}
      </p>
    </form>
  );
}
export function NewsSourceForm() {
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await submit("/api/admin/news-sources", {
        ...Object.fromEntries(f),
        enabled: f.get("enabled") === "on",
      });
      setMessage(
        "Source saved. Existing headlines follow its enabled setting.",
      );
      router.refresh();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  return (
    <form onSubmit={save} className="panel">
      <h2>Manage permitted news sources</h2>
      <p>
        Use an existing feed URL to update or disable it. Feed hosts must be
        explicitly approved in NEWS_ALLOWED_HOSTS. Do not enable a source
        without a recorded reuse permission.
      </p>
      <div className="form-grid">
        <label>
          Source name
          <input name="name" required minLength={2} />
        </label>
        <label>
          Category
          <select name="category">
            {["Nepal", "Gold", "Silver", "Oil", "Global Markets"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="span-2">
          RSS URL
          <input name="url" type="url" required />
        </label>
        <label className="span-2">
          Permission / terms URL
          <input name="terms_url" type="url" required />
        </label>
        <label className="span-2">
          Permission basis
          <textarea name="permission_note" minLength={20} required />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="enabled" />
          Enabled
        </label>
      </div>
      <Button>Save source</Button>
      <p role="status" className="form-message">
        {message}
      </p>
    </form>
  );
}
export function TestPushForm() {
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          const result = await submit("/api/admin/test-push", {
            subscription_id: f.get("subscription_id"),
          });
          setMessage(result.message);
          router.refresh();
        } catch (error) {
          setMessage((error as Error).message);
        }
      }}
    >
      <h2>Verify delivery on a consenting test device</h2>
      <p>
        Subscribe your own device first. Provider acceptance is separate from
        receipt on the device. Confirm both the receipt timestamp and a visible
        notification.
      </p>
      <label>
        Test subscription ID
        <input name="subscription_id" required />
      </label>
      <Button>Send clearly labelled test</Button>
      <p role="status">{message}</p>
    </form>
  );
}
