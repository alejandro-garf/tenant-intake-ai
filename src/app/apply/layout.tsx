import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/get-current-user";

/**
 * Applicant layout: enforces authentication for /apply routes.
 * This is the ONLY security boundary for /apply routes — middleware does not enforce auth.
 */
export default async function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  // Not authenticated
  if (!session) {
    redirect("/login");
  }

  // Authenticated (any role can apply)
  return <>{children}</>;
}
