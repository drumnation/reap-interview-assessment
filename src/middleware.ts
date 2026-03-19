import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/api/cases/:path*",
    "/api/transactions/:path*",
    "/api/workflows/:path*",
    "/transactions/:path*",
    "/workflows/:path*",
  ],
};
