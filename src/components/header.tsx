"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gem, Globe2, Bell } from "lucide-react";
import { countries } from "@/lib/domain";
import { copy, pathFor, type Locale } from "@/lib/i18n";
export function Header({ locale }: { locale: Locale }) {
  const t = copy[locale],
    pathname = usePathname(),
    router = useRouter();
  const country = pathname.split("/gold-price/")[1] || "nepal";
  const other =
    locale === "ne"
      ? pathname.replace(/^\/ne/, "") || "/"
      : `/ne${pathname === "/" ? "" : pathname}`;
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          href={pathFor(locale)}
          className="brand"
          aria-label="Nepal Metals home"
        >
          <span className="brand-mark">
            <Gem size={23} />
          </span>
          <span>
            Nepal<span className="brand-light">Metals</span>
            <small>THE DAILY REFERENCE</small>
          </span>
        </Link>
        <nav aria-label={locale === "en" ? "Main navigation" : "मुख्य नेभिगेसन"}>
          {[
            [t.gold, "gold-price-in-nepal"],
            [t.silver, "silver-price-in-nepal"],
            [t.history, "gold-price-history"],
            [t.news, "news"],
            [t.compare, "compare"],
          ].map(([name, path]) => (
            <Link
              key={path}
              href={pathFor(locale, path)}
              className={pathname.endsWith(path) ? "active" : ""}
            >
              {name}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <label className="country-select">
            <Globe2 size={16} />
            <span className="sr-only">Country</span>
            <select
              aria-label="Country"
              value={country}
              onChange={(e) =>
                router.push(
                  e.target.value === "nepal"
                    ? pathFor(locale)
                    : pathFor(locale, `gold-price/${e.target.value}`),
                )
              }
            >
              {countries.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </label>
          <a
            className="language"
            href={other}
            lang={locale === "en" ? "ne" : "en"}
          >
            {locale === "en" ? "नेपाली" : "English"}
          </a>
          <a href="#alerts" className="header-bell" aria-label={t.alerts}>
            <Bell size={19} />
          </a>
        </div>
      </div>
    </header>
  );
}
