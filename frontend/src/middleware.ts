import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Admin is a separate, non-localized zone (client-rendered, no SEO) — excluded
  // from locale routing/redirects the same way api/_next/_vercel already are.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
