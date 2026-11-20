"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="error-page">
      <div>
        <h1>We couldn’t load this view.</h1>
        <p>Please try again. No price is inferred when data is unavailable.</p>
        <button className="button button-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
