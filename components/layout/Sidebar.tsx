"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/closet", label: "Closet" },
    { href: "/upload", label: "Upload" },
    { href: "/outfits", label: "Outfits" },
    { href: "/outfits/create", label: "Create Outfit" },
    { href: "/recommendations", label: "Recommendations" },
    { href: "/purchases", label: "Purchases" },
    { href: "/analytics", label: "Analytics" },
    { href: "/wear-tracking", label: "Wear Tracking" },
    { href: "/style-quiz", label: "Style Quiz" },
    { href: "/settings", label: "Settings" },
  ];

  // Close menu when route changes on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-black text-white rounded-md shadow-lg min-h-[44px] min-w-[44px]"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-60 border-r min-h-screen p-6 flex flex-col gap-4 bg-white transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Link href="/" onClick={() => setIsOpen(false)} className="mt-14 lg:mt-0">
          <h1 className="text-2xl font-bold">Stylr</h1>
        </Link>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "px-3 py-2.5 rounded-md transition-colors text-sm lg:text-base",
                pathname === item.href
                  ? "bg-black text-white"
                  : "hover:bg-gray-100"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

