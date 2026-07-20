import { createAuthGuard } from "@lifelens/auth/guard";

export const proxy = createAuthGuard({
  publicPaths: ["/auth/bridge", "/auth/callback", "/offline"],
  isHub: false,
});

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs)$).*)",
};
