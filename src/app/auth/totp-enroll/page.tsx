"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

export default function TOTPEnrollPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    generateSecret();
  }, []);

  const generateSecret = async () => {
    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/totp/generate", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate TOTP secret");
      }

      const data = await response.json();
      setQrCode(data.qrCodeDataURL);
      setSecret(data.secret);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to generate TOTP secret");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/totp/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret, code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Invalid code");
      }

      // Success! Redirect to reviewer dashboard
      router.push("/review");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid code");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <NavHeader title="Set Up Two-Factor Authentication" />

      <div className="py-6 px-gutter max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-large-title mb-2">Secure Your Account</h1>
          <p className="text-body text-secondary-label">
            As a reviewer, you need to set up two-factor authentication to access
            applicant data. This adds an extra layer of security to your account.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-system-red/10 border border-system-red/20 rounded-ios-card">
            <p className="text-body text-system-red">{error}</p>
          </div>
        )}

        {isGenerating ? (
          <div className="mb-6 p-8 bg-content-background rounded-ios-card shadow-card text-center">
            <p className="text-body text-secondary-label">Generating QR code...</p>
          </div>
        ) : qrCode ? (
          <>
            <div className="mb-6 p-6 bg-content-background rounded-ios-card shadow-card">
              <h2 className="text-title3 mb-4">Step 1: Scan QR Code</h2>
              <p className="text-body text-secondary-label mb-4">
                Open your authenticator app (Google Authenticator, 1Password, Authy,
                etc.) and scan this QR code:
              </p>

              <div className="flex justify-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCode}
                  alt="TOTP QR Code"
                  className="w-64 h-64 rounded-ios-card"
                />
              </div>

              <div className="p-4 bg-secondary-grouped-background rounded-ios-card">
                <p className="text-footnote text-secondary-label mb-2">
                  Manual entry code (if you can&apos;t scan):
                </p>
                <code className="text-caption font-mono break-all">{secret}</code>
              </div>
            </div>

            <div className="mb-6 p-6 bg-content-background rounded-ios-card shadow-card">
              <h2 className="text-title3 mb-4">Step 2: Verify Code</h2>
              <p className="text-body text-secondary-label mb-4">
                Enter the 6-digit code from your authenticator app to complete setup:
              </p>

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
                />

                <Button
                  type="submit"
                  variant="filled"
                  disabled={isVerifying || code.length !== 6}
                  className="w-full"
                >
                  {isVerifying ? "Verifying..." : "Complete Setup"}
                </Button>
              </form>
            </div>

            <div className="p-4 bg-secondary-grouped-background rounded-ios-card">
              <p className="text-footnote text-secondary-label text-center">
                After setup, you&apos;ll need to enter a code from your authenticator
                app every time you sign in.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
