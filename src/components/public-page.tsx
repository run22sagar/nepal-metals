import Link from "next/link";
import { Clock3, Info, ShieldCheck, Gem } from "lucide-react";
import NepaliDate from "nepali-date-converter";
import { Header } from "./header";
import { PriceCard } from "./price-card";
import { History } from "./history";
import { Calculator } from "./calculator";
import { Comparison } from "./comparison";
import { News } from "./news";
import { Alerts } from "./alerts";
import { AutoRefresh } from "./auto-refresh";
import { readMarket } from "@/lib/data";
import { copy, pathFor, type Locale } from "@/lib/i18n";
import { pageInfo, faqs } from "@/lib/pages";
import { nepalDate } from "@/lib/domain";
import { alertsReady, siteUrl } from "@/lib/security";
import { databaseReady } from "@/lib/db";
export async function PublicPage({
  path = "",
  locale = "en",
}: {
  path?: string;
  locale?: Locale;
}) {
  const market = await readMarket(),
    t = copy[locale],
    info = pageInfo(path, locale),
    now = new Date();
  const fullDate = new Intl.DateTimeFormat(
    locale === "ne" ? "ne-NP" : "en-GB",
    {
      timeZone: "Asia/Kathmandu",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(now);
  let bs = "";
  try {
    const [year, month, day] = nepalDate(now).split("-").map(Number);
    bs =
      new NepaliDate(new Date(year, month - 1, day, 12)).format(
        "DD MMMM YYYY",
        "np",
      ) + " BS";
  } catch {
    /* Supported calendar range exceeded: do not guess a BS date. */
  }
  const home = path === "",
    isPrice = path.endsWith("price-in-nepal"),
    isHistory = path.endsWith("price-history"),
    isArticle = ["privacy", "methodology"].includes(path),
    metal = path.startsWith("silver") ? "silver" : "gold";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl()}/#website`,
        url: siteUrl(),
        name: "Nepal Metals",
        inLanguage: locale === "ne" ? "ne-NP" : "en-NP",
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl()}${pathFor(locale, path)}#page`,
        url: `${siteUrl()}${pathFor(locale, path)}`,
        name: info.title,
        description: info.description,
        inLanguage: locale === "ne" ? "ne-NP" : "en-NP",
        isPartOf: { "@id": `${siteUrl()}/#website` },
      },
      ...(path
        ? [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: siteUrl() + pathFor(locale),
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: info.title,
                  item: siteUrl() + pathFor(locale, path),
                },
              ],
            },
          ]
        : []),
    ],
  };
  return (
    <div lang={locale === "ne" ? "ne-NP" : "en-NP"}>
      <Header locale={locale} />
      <AutoRefresh />
      <div className="market-strip">
        <div className="container">
          <span className="strip-tag">
            <ShieldCheck size={14} />
            {t.reference}
          </span>
          <span className="strip-time">
            <Clock3 size={14} />
            {locale === "en"
              ? "Publication dates follow Nepal time"
              : "प्रकाशन मिति नेपाल समयअनुसार"}{" "}
            · UTC +05:45
          </span>
        </div>
      </div>
      <main id="main" className="container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
        {path && (
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href={pathFor(locale)}>
              {locale === "en" ? "Home" : "गृहपृष्ठ"}
            </Link>
            <span>/</span>
            <span>{info.title}</span>
          </nav>
        )}
        {isArticle ? (
          <article className="article-page">
            <h1>{info.title}</h1>
            <Editorial path={path} locale={locale} />
          </article>
        ) : (
          <>
            <div className="hero">
              <div>
                <span className="eyebrow">{t.eyebrow}</span>
                <h1>{info.title}</h1>
                <p>{info.description}</p>
              </div>
              <div className="date-block">
                <strong>{fullDate}</strong>
                {bs && <span>{bs}</span>}
              </div>
            </div>
            {market.status === "failed" && (
              <p role="status" className="notice">
                {locale === "en"
                  ? "Price records are temporarily unavailable. Please check again shortly."
                  : "मूल्य अभिलेख अस्थायी रूपमा उपलब्ध छैन। केही समयपछि पुनः प्रयास गर्नुहोस्।"}
              </p>
            )}
            {(home || isPrice) && (
              <>
                <div className="price-grid">
                  {(isPrice ? [metal] : ["gold", "silver"]).map((m) => (
                    <PriceCard
                      key={m}
                      metal={m as "gold" | "silver"}
                      records={market.prices}
                      locale={locale}
                    />
                  ))}
                </div>
                <p className="reference-note">
                  <Info size={15} />
                  {locale === "en"
                    ? "Nepal reference rates follow daily source publications. They are not continuously trading international spot prices."
                    : "नेपालको सन्दर्भ मूल्य दैनिक स्रोत प्रकाशनमा आधारित हुन्छ। यो अन्तर्राष्ट्रिय प्रत्यक्ष स्पट मूल्य होइन।"}
                </p>
              </>
            )}
            {(home || isPrice || isHistory) && (
              <div className="dashboard-middle">
                <History
                  records={market.history}
                  locale={locale}
                  initialMetal={metal}
                />
                <Calculator prices={market.prices} locale={locale} />
              </div>
            )}
            {(home || path === "compare" || info.country) && (
              <Comparison
                prices={market.prices}
                spot={market.spot}
                locale={locale}
                selectedCountry={info.country?.slug}
              />
            )}
            <Alerts
              locale={locale}
              configured={databaseReady() && alertsReady()}
              publicKey={process.env.VAPID_PUBLIC_KEY || ""}
            />
            {(home || path === "news") && (
              <News
                articles={market.articles}
                status={market.newsStatus}
                locale={locale}
              />
            )}
            <section className="faq-section">
              <div>
                <span className="eyebrow">{t.learn}</span>
                <h2>{t.faq}</h2>
              </div>
              <div>
                {faqs[locale].map(([q, a]) => (
                  <details key={q}>
                    <summary>{q}</summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="footer">
        <div className="container">
          <div>
            <Link href={pathFor(locale)} className="brand">
              <Gem size={21} />
              <span>
                Nepal<span className="brand-light">Metals</span>
              </span>
            </Link>
            <p>{t.footer}</p>
          </div>
          <div className="footer-links">
            <Link href={pathFor(locale, "methodology")}>{t.methodology}</Link>
            <Link href={pathFor(locale, "privacy")}>{t.privacy}</Link>
            <Link href={pathFor(locale, "silver-price-history")}>
              {t.silverHistory}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
function Editorial({ path, locale }: { path: string; locale: Locale }) {
  if (path === "privacy")
    return locale === "ne" ? (
      <>
        <p>
          हामी खाताबिना सार्वजनिक मूल्य हेर्न दिन्छौँ। सूचना तपाईंको स्पष्ट अनुमति लिएपछि
          मात्र सक्रिय हुन्छ।
        </p>
        <h2>सूचनाका लागि राखिने तथ्याङ्क</h2>
        <p>
          उपकरणको सदस्यता ठेगाना र कुञ्जीहरू इन्क्रिप्ट गरेर सर्भरमा राखिन्छन्। धातुको
          प्राथमिकता, सहमतिको समय र वितरण अवस्था सुरक्षित गरिन्छ। ब्राउजरको सुरक्षित
          कुकीले तपाईंको सदस्यता व्यवस्थापन गर्छ।
        </p>
        <h2>सदस्यता रद्द गर्ने</h2>
        <p>
          दैनिक मूल्य सूचना खोल्नुहोस् र सदस्यता रद्द गर्नुहोस्। यसले उपकरणको सदस्यता,
          प्राथमिकता र सम्बन्धित वितरण अभिलेख हटाउँछ। ब्राउजरको सूचना अनुमति पनि हटाउन
          सक्नुहुन्छ।
        </p>
        <h2>विश्लेषण र अभिलेख</h2>
        <p>
          पूर्वनिर्धारित रूपमा विश्लेषण बन्द छ। वैकल्पिक Plausible विश्लेषणले कुकीबिना समग्र
          प्रयोग मापन गर्न सक्छ। होस्टिङ सेवाले सुरक्षा र सञ्चालनका लागि अनुरोध अभिलेख राख्न
          सक्छ।
        </p>
      </>
    ) : (
      <>
        <p>
          You can read public prices without an account. Notifications activate
          only after you explicitly allow them.
        </p>
        <h2>What an alert subscription stores</h2>
        <p>
          We encrypt the browser push endpoint and its keys on the server. We
          store your selected metals, daily alert preference, consent time and
          delivery status. A secure, HTTP-only device cookie lets this browser
          manage its subscription; it is not used for advertising.
        </p>
        <h2>Unsubscribe and removal</h2>
        <p>
          Open Get daily price alerts and choose Unsubscribe this device. This
          removes the server subscription, preferences and associated delivery
          records. You may also revoke notification permission in your browser.
          Expired endpoints are removed when the push service reports expiry; an
          invalid endpoint is not contacted repeatedly.
        </p>
        <h2>Analytics and operational logs</h2>
        <p>
          Analytics are disabled by default. An optional Plausible integration
          measures aggregate traffic without analytics cookies. Hosting
          providers may retain request metadata for security and operations.
          Rate-limit identifiers are hashed; raw client IP addresses are not
          stored in the application database. Routine ingestion and delivery
          logs are pruned after 90 days; the financial correction audit remains
          for accountability.
        </p>
        <h2>Service providers</h2>
        <p>
          The deployed service uses Supabase for database and administrator
          authentication, Vercel for hosting, and browser push services for
          notification transport. A push service accepting a message does not
          guarantee that the device displayed it.
        </p>
      </>
    );
  return locale === "ne" ? (
    <>
      <p>यो स्वतन्त्र जानकारी सेवा हो। हामी FENEGOSIDA सँग आबद्ध भएको दाबी गर्दैनौँ।</p>
      <h2>नेपालको सन्दर्भ मूल्य</h2>
      <p>
        अधिकृत प्रशासकले मूल प्रकाशन जाँचेर स्रोत लिङ्क, प्रकाशन समय र प्रमाण सुरक्षित गरेपछि
        मात्र मूल्य प्रकाशित हुन्छ। अनुमतिप्राप्त स्वचालित स्रोत नभएसम्म म्यानुअल प्रकाशन प्रयोग
        गरिन्छ। अघिल्लो मूल्य आजको भनी देखाइँदैन।
      </p>
      <h2>अन्तर्राष्ट्रिय अनुमान</h2>
      <p>
        Metals.Dev को सक्रिय सदस्यताबाट प्राप्त स्पट मूल्य र विनिमय दर प्रयोग गरिन्छ।
        अन्तर्राष्ट्रिय पङ्क्तिहरू स्थानीय आधिकारिक खुद्रा मूल्य होइनन्।
      </p>
      <h2>अभिलेख र शुद्धता</h2>
      <p>
        छुटेका दिनको मूल्य अनुमान गरिँदैन। एक तोला ११.६६३८०३८ ग्राम हो। सुधारको कारण र
        अघिल्लो अभिलेख सुरक्षित रहन्छ।
      </p>
    </>
  ) : (
    <>
      <p>
        Nepal Metals is an independent information service. We do not claim
        affiliation with FENEGOSIDA or any dealer.
      </p>
      <h2>Nepal reference publications</h2>
      <p>
        Our priority source is the{" "}
        <a
          href="https://www.fenegosida.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Federation of Nepal Gold and Silver Dealers’ Association (FENEGOSIDA)
        </a>
        . No supported, authorized automated feed has been established for this
        deployment. An authorized editor must verify each source publication,
        document its publication time and source link, and record evidence
        before publishing a reference rate.
      </p>
      <p>
        Reference rates are stored in NPR per tola. Each rate includes a Nepal
        publication date, actual publication timestamp, verification status and
        database recording time. Corrections preserve an audit trail.
        Republishing the same unchanged record does not create a new daily
        observation.
      </p>
      <h2>Freshness and missing data</h2>
      <p>
        “Published today” means the source’s publication date matches today in
        Asia/Kathmandu. An older record is explicitly labelled as the latest
        available rate, not today’s price. We do not infer official holidays or
        market closure without a reliable source calendar. Failed ingestion
        retains the last verified observation. Historical charts leave gaps
        instead of inventing missing values.
      </p>
      <h2>International spot estimates</h2>
      <p>
        Our provider adapter uses{" "}
        <a href="https://metals.dev/docs">Metals.Dev</a> for USD-per-troy-ounce
        gold and silver observations and exchange rates. The default retrieval
        interval is 30 minutes. Observations older than two hours are labelled
        delayed. Country comparisons convert a global spot reference into local
        currencies; they do not represent official country-specific retail
        quotations. Data display requires an active provider subscription.
        Historical storage is separately gated by the operator’s license
        confirmation.
      </p>
      <h2>Conversions and purity</h2>
      <p>
        One tola is 11.6638038 grams; one troy ounce is 31.1034768 grams. The
        calculator adjusts gold purity proportionally (22/24 or 18/24) without
        presenting those results as published reference rates. Display values
        are rounded to two decimals. Fees, taxes, making charges and dealer
        margins are excluded.
      </p>
      <h2>News selection</h2>
      <p>
        Only feeds with a recorded permission basis and an approved host can be
        enabled. We store headlines, source names, publication times and
        original links, not full articles. Nepal articles appear first in the
        combined view. Feed errors are disclosed while earlier headlines retain
        their original dates.
      </p>
    </>
  );
}
