"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./Button";

interface SignOutButtonProps {
  variant?: "filled" | "tinted" | "plain";
  className?: string;
}

export function SignOutButton({ variant = "plain", className }: SignOutButtonProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={className}
    >
      {isSigningOut ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
