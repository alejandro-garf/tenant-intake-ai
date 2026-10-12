"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

export default function TOTPVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/totp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Invalid code");
      }

      // Success! Redirect to reviewer dashboard
      router.push("/review");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid code");
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <NavHeader title="Two-Factor Authentication" />

      <div className="py-6 px-gutter max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-large-title mb-2">Enter Authentication Code</h1>
          <p className="text-body text-secondary-label">
            Open your authenticator app and enter the 6-digit code to continue.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-system-red/10 border border-system-red/20 rounded-ios-card">
            <p className="text-body text-system-red">{error}</p>
          </div>
        )}

        <div className="mb-6 p-6 bg-content-background rounded-ios-card shadow-card">
          <form onSubmit={handleVerify} className="space-y-4">
            <TextField
              label="Authentication Code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
              disabled={isVerifying}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoFocus
            />

            <Button
              type="submit"
              variant="filled"
              disabled={isVerifying || code.length !== 6}
              className="w-full"
            >
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
          </form>
        </div>

        <div className="p-4 bg-secondary-grouped-background rounded-ios-card">
          <p className="text-footnote text-secondary-label text-center">
            The code refreshes every 30 seconds in your authenticator app.
          </p>
        </div>
      </div>
    </div>
  );
}
