"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const response = await fetch("/api/auth/request-magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send magic link");
      }

      setSubmitMessage(
        "Magic link sent! Check your email to sign in. The link will expire in 15 minutes."
      );
      setEmail("");
    } catch (error) {
      setSubmitMessage(
        error instanceof Error ? error.message : "Failed to send magic link"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <NavHeader title="Sign In" />

      <div className="py-6 px-gutter max-w-lg mx-auto">
        {/* Error messages from URL params */}
        {error && (
          <div className="mb-6 p-4 bg-system-red/10 border border-system-red/20 rounded-ios-card">
            <p className="text-body text-system-red">
              {error === "invalid-token" && "Invalid login link"}
              {error === "expired-or-invalid" &&
                "This login link has expired or has already been used"}
              {error === "verification-failed" &&
                "Failed to verify login link. Please try again."}
            </p>
          </div>
        )}

        {/* Submit message */}
        {submitMessage && (
          <div
            className={`mb-6 p-4 rounded-ios-card ${
              submitMessage.includes("sent")
                ? "bg-system-green/10 border border-system-green/20"
                : "bg-system-red/10 border border-system-red/20"
            }`}
          >
            <p
              className={`text-body ${
                submitMessage.includes("sent")
                  ? "text-system-green"
                  : "text-system-red"
              }`}
            >
              {submitMessage}
            </p>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-large-title mb-2">Welcome</h1>
          <p className="text-body text-secondary-label">
            Enter your email to receive a one-time login link. No password
            required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            variant="filled"
            disabled={isSubmitting || !email}
            className="w-full"
          >
            {isSubmitting ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>

        <div className="mt-8 p-4 bg-secondary-grouped-background rounded-ios-card">
          <p className="text-footnote text-secondary-label text-center">
            The magic link will be valid for 15 minutes. If you don&apos;t
            receive it, check your spam folder or try again.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * useSearchParams() requires a Suspense boundary so Next.js can prerender
 * this page at build time (it bails out to client rendering inside the boundary).
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
