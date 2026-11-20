import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="error-page">
      <div>
        <h1>This page isn’t here.</h1>
        <p>Return to Nepal’s gold and silver dashboard.</p>
        <Link className="button button-primary" href="/">
          Go to homepage
        </Link>
      </div>
    </main>
  );
}
