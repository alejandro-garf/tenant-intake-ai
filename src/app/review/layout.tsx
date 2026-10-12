import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/get-current-user";

// CRITICAL: Force dynamic rendering. Never cache or statically generate reviewer pages.
// This ensures the auth guard runs on EVERY request.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Reviewer layout: enforces authentication + reviewer role + TOTP verification.
 * This is the ONLY security boundary for /review routes — middleware does not enforce auth.
 */
export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  // Not authenticated
  if (!session) {
    redirect("/login");
  }

  const { user, totpVerified } = session;

  // Not a reviewer
  if (user.role !== "reviewer") {
    redirect("/login");
  }

  // Reviewer but TOTP not verified yet
  if (!totpVerified) {
    redirect("/auth/totp-verify");
  }

  // Authenticated reviewer with TOTP verified
  return <>{children}</>;
}
