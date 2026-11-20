import type { Metadata } from "next";
import { siteUrl } from "./security";
import { pageInfo } from "./pages";
import { pathFor, type Locale } from "./i18n";
export function pageMetadata(path: string, locale: Locale): Metadata {
  const info = pageInfo(path, locale),
    canonical = siteUrl() + pathFor(locale, path);
  return {
    title: info.title,
    description: info.description,
    alternates: {
      canonical,
      languages: {
        "en-NP": siteUrl() + pathFor("en", path),
        "ne-NP": siteUrl() + pathFor("ne", path),
        "x-default": siteUrl() + pathFor("en", path),
      },
    },
    openGraph: {
      title: info.title,
      description: info.description,
      url: canonical,
      siteName: "Nepal Metals",
      locale: locale === "ne" ? "ne_NP" : "en_NP",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: info.title,
      description: info.description,
    },
  };
}
