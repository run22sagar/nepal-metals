import type { MetadataRoute } from "next";
import { routes } from "@/lib/pages";
import { pathFor } from "@/lib/i18n";
import { siteUrl } from "@/lib/security";
export default function sitemap(): MetadataRoute.Sitemap {
  return routes.flatMap((path) =>
    (["en", "ne"] as const).map((locale) => ({
      url: siteUrl() + pathFor(locale, path),
      changeFrequency:
        path === "privacy" || path === "methodology"
          ? ("monthly" as const)
          : ("daily" as const),
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: {
          "en-NP": siteUrl() + pathFor("en", path),
          "ne-NP": siteUrl() + pathFor("ne", path),
        },
      },
    })),
  );
}
