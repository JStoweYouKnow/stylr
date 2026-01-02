"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("HomePage - session status:", status);
    console.log("HomePage - session data:", session);

    // Wait for session to load
    if (status === "loading") {
      console.log("HomePage - waiting for session to load...");
      return;
    }

    setIsLoading(false);

    // Redirect if authenticated
    if (session) {
      console.log("HomePage - user authenticated, redirecting to /closet");
      router.push("/closet");
    } else {
      console.log("HomePage - no session, showing landing page");
    }
  }, [session, status, router]);

  // Show loading state briefly
  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Welcome to Stylr</h1>
        <p className="text-gray-600 mb-8 text-lg">
          Your smart AI-powered wardrobe assistant
        </p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium"
          >
            Sign In
          </Link>
          <div>
            <Link
              href="/signup"
              className="text-gray-600 hover:text-black transition"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
