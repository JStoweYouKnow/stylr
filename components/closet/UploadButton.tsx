"use client";

import Link from "next/link";

export default function UploadButton() {
  return (
    <Link
      href="/upload"
      className="inline-flex items-center px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 mr-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      Upload Item
    </Link>
  );
}

