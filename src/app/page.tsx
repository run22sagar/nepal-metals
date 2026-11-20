import { PublicPage } from "@/components/public-page";
import { pageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata("", "en");
export default function Home() {
  return <PublicPage />;
}
