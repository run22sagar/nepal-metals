import { NextResponse, type NextRequest } from "next/server";
import { routes } from "./lib/pages";
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/icons/') || ['/sw.js','/favicon.ico','/manifest.webmanifest'].includes(pathname)) return NextResponse.next();
  const publicPath = pathname.replace(/^\/ne(?=\/|$)/, '').replace(/^\//, '').replace(/\/$/, '');
  if (!routes.includes(publicPath) && !['/admin','/robots.txt','/sitemap.xml','/opengraph-image','/offline.html'].includes(pathname)) {
    // Reject unknown public paths before streaming so crawlers receive a real 404.
    return new NextResponse('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | Nepal Metals</title><body style="font:18px/1.6 system-ui;background:#f7f8f4;color:#203d34;padding:10vh 24px"><main><h1>This page isn’t here.</h1><p><a href="/">Return to Nepal Metals</a></p></main></body></html>', {status:404,headers:{'Content-Type':'text/html; charset=utf-8'}});
  }
  const headers = new Headers(request.headers);
  headers.set(
    "x-site-locale",
    /^\/ne(?:\/|$)/.test(request.nextUrl.pathname) ? "ne" : "en",
  );
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: ["/:path*"],
};
