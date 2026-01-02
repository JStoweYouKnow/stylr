"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [hasAvatar, setHasAvatar] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAvatar = async () => {
      try {
        const res = await fetch("/api/user/avatar", { cache: "no-store" });
        if (!res.ok) {
          setHasAvatar(null);
          return;
        }
        const data = await res.json();
        setHasAvatar(!!data.avatar?.url);
      } catch {
        setHasAvatar(null);
      }
    };

    checkAvatar();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-semibold">Dashboard</h2>
      <p className="text-gray-600">Welcome to your wardrobe assistant!</p>

      {/* Avatar prompt for first-time users */}
      {hasAvatar === false && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-blue-900">Set up your avatar</p>
              <p className="text-sm text-blue-800">
                Upload a full-body photo to create your avatar for virtual try-ons.
              </p>
            </div>
            <Link
              href="/settings#avatar"
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Upload Photo
            </Link>
          </div>
          <p className="text-xs text-blue-800">
            Tip: Stand in a neutral pose with good lighting for best results.
          </p>
        </div>
      )}
    </div>
  );
}

