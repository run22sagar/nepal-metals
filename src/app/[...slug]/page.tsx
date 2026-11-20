import { notFound } from "next/navigation";
import { PublicPage } from "@/components/public-page";
import { routes } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
function resolve(slug: string[]) {
  const locale = slug[0] === "ne" ? "ne" : "en";
  const path = (locale === "ne" ? slug.slice(1) : slug).join("/");
  if (!routes.includes(path)) notFound();
  return { locale, path } as const;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { locale, path } = resolve((await params).slug);
  return pageMetadata(path, locale);
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { locale, path } = resolve((await params).slug);
  return <PublicPage locale={locale} path={path} />;
}
