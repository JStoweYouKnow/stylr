"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import Button from "@/components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { update: updateSession } = useSession();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("Submitting login form for:", email);

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("Sign in result:", result);

      // Handle different result states
      if (!result) {
        console.error("No result returned from signIn");
        setError("Authentication failed. Please try again.");
        setLoading(false);
        return;
      }

      // Check for errors
      if (result.error) {
        console.error("Sign in error:", result.error);

        // Map common errors to user-friendly messages
        if (result.error === "CredentialsSignin") {
          setError("Unable to sign in. Please check your credentials and try again.");
        } else if (result.error.includes("Database")) {
          setError("Database connection error. Please try again in a moment.");
        } else {
          setError(result.error);
        }

        setLoading(false);
        return;
      }

      // Check if sign in was successful
      if (result.ok) {
        console.log("✅ Sign in successful!");

        // Update session
        try {
          console.log("Updating session...");
          await updateSession();
          console.log("Session updated");
        } catch (updateError) {
          console.warn("Session update warning (continuing anyway):", updateError);
        }

        // Force full-page navigation with relative URL (works for both local and production)
        console.log("Redirecting to closet...");
        window.location.href = "/closet";
        return; // Prevent any further code execution
      } else {
        console.error("Sign in failed with ok=false");
        setError("Unable to complete sign in. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Sign in exception:", err);
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 sm:p-8 border rounded-xl max-w-md w-full shadow-sm">
        <h1 className="text-3xl font-bold mb-2">Welcome to Stylr</h1>
        <p className="text-gray-600 mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter your password"
            />
            <p className="text-xs text-gray-500 mt-1">
              New users: Enter any password to create an account
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Don't have an account?{" "}
            <Link href="/signup" className="text-black font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
